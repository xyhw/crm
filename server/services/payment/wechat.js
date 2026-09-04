import { config } from '../../config.js';
import { query } from '../../db.js';
import { BasePaymentAdapter } from './base.js';
import { getAccessToken } from '../wechat.service.js';
import {
  calcPaySig,
  calcUserSignature,
  stableStringify,
  parseProductMap,
  resolveProductId,
  parseDeliverNotifyXml,
  verifyMpPushSignature,
  deliverNotifyOkXml,
} from './vpay-sign.js';

const SIGN_DATA_KEYS = [
  'offerId',
  'buyQuantity',
  'env',
  'currencyType',
  'productId',
  'goodsPrice',
  'outTradeNo',
  'attach',
];

const QUERY_URI = '/xpay/query_order';
const XPAY_QUERY_URL = 'https://api.weixin.qq.com/xpay/query_order';

/**
 * 个人主体小程序虚拟支付适配器（道具直购）。
 * createPayment 返回 wx.requestVirtualPayment 所需 payData：
 *   { mode, signData, paySig, signature }
 * 发货以 xpay_goods_deliver_notify 推送为主，query_order 查单兜底。
 */
export class WechatAdapter extends BasePaymentAdapter {
  constructor() {
    super('wechat');
    this.cfg = config.payment.wechat;
  }

  isConfigured() {
    return !!(this.cfg.appId && this.cfg.offerId && this.cfg.appKey);
  }

  productMap() {
    return parseProductMap(this.cfg.productMap);
  }

  async createPayment(payload) {
    if (!this.isConfigured()) {
      throw new Error('微信虚拟支付未配置：请填写 AppID / OfferID / 现网 AppKey');
    }
    if (!payload.sessionKey) {
      const err = new Error('缺少微信登录凭证，请在小程序内重新登录后再充值');
      err.code = 400;
      throw err;
    }
    if (!payload.openid) {
      const err = new Error('当前账号未绑定微信，请先用微信登录');
      err.code = 400;
      throw err;
    }

    const productId = resolveProductId(payload.amount, this.productMap());
    const env = Number(this.cfg.env) === 1 ? 1 : 0;
    const signObj = {
      offerId: String(this.cfg.offerId),
      buyQuantity: 1,
      env,
      currencyType: 'CNY',
      productId: String(productId),
      goodsPrice: payload.price,
      outTradeNo: payload.orderNo,
      attach: JSON.stringify({ uid: payload.userId, amount: payload.amount }),
    };
    const signData = stableStringify(signObj, SIGN_DATA_KEYS);
    const paySig = calcPaySig('requestVirtualPayment', signData, this.cfg.appKey);
    const signature = calcUserSignature(signData, payload.sessionKey);

    return {
      payMethod: 'virtual',
      prepaidId: productId,
      payData: {
        mode: 'short_series_goods',
        signData,
        paySig,
        signature,
      },
    };
  }

  async queryOrder({ orderNo, openid }) {
    if (!this.isConfigured()) throw new Error('微信虚拟支付未配置');
    if (!openid) return { status: 'pending', raw: { skip: 'missing_openid' } };

    const accessToken = await getAccessToken();
    const bodyObj = { openid, env: Number(this.cfg.env) === 1 ? 1 : 0, order_id: orderNo };
    const postBody = JSON.stringify(bodyObj);
    const paySig = calcPaySig(QUERY_URI, postBody, this.cfg.appKey);
    const url = `${XPAY_QUERY_URL}?access_token=${encodeURIComponent(accessToken)}&pay_sig=${encodeURIComponent(paySig)}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: postBody,
    });
    const data = await resp.json();
    if (data.errcode && data.errcode !== 0) {
      return { status: 'pending', raw: data };
    }
    const order = data.order || data;
    const wxStatus = String(order.status || order.order_state || order.pay_state || '').toLowerCase();
    const paid = wxStatus === 'success' || wxStatus === 'paid' || order.paid === true
      || Number(order.status) === 1 || !!(order.wx_order_id || order.transaction_id);
    if (!paid) return { status: 'pending', raw: data };
    return {
      status: 'paid',
      paidAt: order.paid_time ? new Date(Number(order.paid_time) * 1000 || order.paid_time) : new Date(),
      payChannelOrderNo: order.wx_order_id || order.transaction_id || order.mch_order_no || null,
      raw: data,
    };
  }

  async verifyNotify(headers, rawBody) {
    if (!this.isConfigured()) return false;
    const xml = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '');
    if (!xml.includes('<xml') && !xml.includes('<Event')) return false;
    const parsed = parseDeliverNotifyXml(xml);
    if (parsed.event && parsed.event !== 'xpay_goods_deliver_notify') return false;
    if (!parsed.outTradeNo) return false;
    const token = this.cfg.pushToken;
    if (!token) return true;
    const signature = headers['x-wechat-signature'] || headers['signature'] || headers['msg_signature'];
    const timestamp = headers['timestamp'] || headers['x-wechat-timestamp'];
    const nonce = headers['nonce'] || headers['x-wechat-nonce'];
    if (!signature) return true;
    return verifyMpPushSignature(token, timestamp, nonce, signature);
  }

  async parseNotifyResult(_headers, rawBody) {
    const parsed = parseDeliverNotifyXml(rawBody);
    return {
      orderNo: parsed.outTradeNo,
      payChannelOrderNo: parsed.wxOrderId || null,
      paidAmount: null,
      paidAt: new Date(),
      raw: parsed,
    };
  }

  buildNotifyResponse() {
    return deliverNotifyOkXml();
  }
}

export async function listPendingWechatOrders(limit = 50) {
  return query(
    `SELECT po.order_no, po.user_id, u.wechat_openid AS openid
     FROM payment_orders po
     LEFT JOIN users u ON u.id = po.user_id
     WHERE po.channel = 'wechat' AND po.status = 'pending'
       AND po.created_at > DATE_SUB(NOW(), INTERVAL 2 DAY)
     ORDER BY po.id ASC
     LIMIT ${Number(limit) || 50}`
  );
}
