import { config } from '../../config.js';
import { BasePaymentAdapter } from './base.js';

/**
 * 微信支付适配器（占位）。
 * 当前仅校验配置是否就绪，真实下单/验签需接入微信支付 v3 SDK 后补全。
 * 接入步骤：
 *   1. 在 .env 填入 PAY_WECHAT_APPID / PAY_WECHAT_MCHID / PAY_WECHAT_APIV3KEY /
 *      PAY_WECHAT_SERIALNO / PAY_WECHAT_PRIVATE_KEY_PATH / PAY_WECHAT_NOTIFY_URL
 *   2. 安装 wechatpay-axios-sdk（或自实现 v3 签名）
 *   3. 在本文件实现 createPayment（JSAPI/H5/Native）与 verifyNotify（验签 + 解密）
 *   4. 将 PAY_DEFAULT_CHANNEL 切换为 wechat
 */
export class WechatAdapter extends BasePaymentAdapter {
  constructor() {
    super('wechat');
    this.cfg = config.payment.wechat;
  }

  isConfigured() {
    return !!(this.cfg.appId && this.cfg.mchId && this.cfg.apiV3Key && this.cfg.privateKeyPath && this.cfg.notifyUrl);
  }

  async createPayment(payload) {
    if (!this.isConfigured()) {
      throw new Error('微信支付渠道未配置：请在 .env 填入 PAY_WECHAT_* 系列变量并完成 SDK 对接');
    }
    throw new Error(`微信支付 SDK 对接待实现，订单 ${payload.orderNo} 已创建，请补充 createPayment 调用`);
  }

  async queryOrder() {
    if (!this.isConfigured()) throw new Error('微信支付渠道未配置');
    throw new Error('微信支付查单逻辑待实现，请补充 wechatpay SDK 调用');
  }

  async verifyNotify() {
    if (!this.isConfigured()) throw new Error('微信支付渠道未配置');
    throw new Error('微信支付回调验签待实现，请补充 v3 验签+解密逻辑');
  }

  async parseNotifyResult() {
    throw new Error('微信支付回调解析待实现');
  }

  buildNotifyResponse() {
    return { code: 'SUCCESS', message: '成功' };
  }
}
