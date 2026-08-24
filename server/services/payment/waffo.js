import { WaffoPancake, verifyWebhook } from '@waffo/pancake-ts';
import { config } from '../../config.js';
import { query } from '../../db.js';
import { BasePaymentAdapter } from './base.js';

/**
 * Waffo Pancake 支付适配器（merchant-of-record 托管收银台）。
 * 流程：创建 checkout 会话 -> 返回 checkoutUrl -> 用户跳转托管收银台支付
 *       -> Waffo 服务端回调 /api/points/recharge/notify/waffo -> 验签入账。
 * 配置（后台/环境变量）：
 *   merchantId  Merchant ID（MER_ 前缀）
 *   privateKey  RSA 私钥（PEM 或 base64，SDK 自动归一化）
 *   storeId     Store ID（STO_ 前缀）
 *   productId   可选；未配置时首次下单自动创建一次性商品「积分充值」
 *   currency    结算币种（默认 USD）
 *   environment 'test' | 'prod'
 *   successUrl  支付成功跳转地址
 */
export class WaffoAdapter extends BasePaymentAdapter {
  constructor() {
    super('waffo');
    this.cfg = config.payment.waffo;
    this._client = null;
    this._productId = null;
  }

  isConfigured() {
    return !!(this.cfg.merchantId && this.cfg.privateKey && this.cfg.storeId);
  }

  get client() {
    if (!this.isConfigured()) {
      throw new Error('Waffo 渠道未配置：请填写 Merchant ID / Private Key / Store ID');
    }
    if (!this._client) {
      this._client = new WaffoPancake({
        merchantId: this.cfg.merchantId,
        privateKey: this.cfg.privateKey,
      });
    }
    return this._client;
  }

  /** 确保存在一次性商品（有配置 productId 直接用，否则自动创建并持久化，避免重启重复建品） */
  async ensureProduct() {
    if (this.cfg.productId) return this.cfg.productId;
    if (this._productId) return this._productId;
    const { product } = await this.client.onetimeProducts.create({
      storeId: this.cfg.storeId,
      name: '积分充值',
      description: '平台积分充值',
      prices: {
        [this.cfg.currency]: { amount: '1.00', taxIncluded: true, taxCategory: 'digital_goods' },
      },
      metadata: { source: 'hotel-order-follow' },
    });
    this._productId = product.id;
    this.cfg.productId = product.id;
    await query(
      `INSERT INTO system_configs (config_key, config_value, config_type, description)
       VALUES ('pay_waffo_product_id', ?, 'string', 'Waffo 商品ID(留空自动创建)')
       ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
      [product.id]
    );
    return product.id;
  }

  async createPayment({ orderNo, price, subject, userId, email }) {
    if (!this.isConfigured()) {
      throw new Error('Waffo 渠道未配置：请在后台填写 Merchant ID / Private Key / Store ID');
    }
    const productId = await this.ensureProduct();
    const displayAmount = (price / 100).toFixed(2);
    const session = await this.client.checkout.authenticated.create({
      productId,
      productType: 'onetime',
      currency: this.cfg.currency,
      buyerIdentity: String(userId),
      buyerEmail: email || `user-${userId}@crm.xyhw.com`,
      billingDetail: { country: 'CN', isBusiness: false },
      metadata: { orderNo, subject: subject || '积分充值' },
      successUrl: this.cfg.successUrl || undefined,
      language: 'zh-Hans',
      priceSnapshot: {
        amount: displayAmount,
        taxIncluded: true,
        taxCategory: 'digital_goods',
      },
    });
    return {
      payUrl: session.checkoutUrl,
      prepaidId: session.sessionId,
      payMethod: 'redirect',
    };
  }

  async queryOrder() {
    // Waffo 以 webhook 回调为准；主动对账需 GraphQL 查单，暂不实现。
    throw new Error('Waffo 主动查单待实现，请依赖 webhook 回调结算');
  }

  /** 验签：必须传原始 body（Buffer 或 string），解析后的 JSON 会破坏签名 */
  async verifyNotify(headers, rawBody) {
    const sig = headers?.['x-waffo-signature'];
    if (!sig) return false;
    try {
      const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');
      verifyWebhook(body, sig, { environment: this.cfg.environment });
      return true;
    } catch (err) {
      console.error('[waffo] verifyNotify failed:', err.message);
      return false;
    }
  }

  async parseNotifyResult(_headers, rawBody) {
    const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');
    const sig = _headers?.['x-waffo-signature'];
    const event = verifyWebhook(body, sig, { environment: this.cfg.environment });
    const data = event.data || {};
    // 下单时通过 metadata 透传的内部订单号
    const orderNo = data.orderNo || data.metadata?.orderNo || '';
    return {
      orderNo,
      payChannelOrderNo: data.orderId || event.eventId || '',
      paidAmount: data.amount != null ? data.amount : null,
      paidAt: event.timestamp ? new Date(event.timestamp) : new Date(),
      raw: event,
    };
  }

  buildNotifyResponse() {
    return { status: 'OK' };
  }
}
