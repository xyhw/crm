import { config } from '../../config.js';
import { BasePaymentAdapter } from './base.js';

/**
 * 支付宝适配器（占位）。
 * 接入步骤：
 *   1. 在 .env 填入 PAY_ALIPAY_APPID / PAY_ALIPAY_PRIVATE_KEY / PAY_ALIPAY_PUBLIC_KEY / PAY_ALIPAY_NOTIFY_URL
 *   2. 安装 alipay-sdk
 *   3. 在本文件实现 createPayment（alipay.trade.precreate/wap/app）与 verifyNotify（RSA2 验签）
 *   4. 将 PAY_DEFAULT_CHANNEL 切换为 alipay
 */
export class AlipayAdapter extends BasePaymentAdapter {
  constructor() {
    super('alipay');
    this.cfg = config.payment.alipay;
  }

  isConfigured() {
    return !!(this.cfg.appId && this.cfg.privateKey && this.cfg.alipayPublicKey && this.cfg.notifyUrl);
  }

  async createPayment(payload) {
    if (!this.isConfigured()) {
      throw new Error('支付宝渠道未配置：请在 .env 填入 PAY_ALIPAY_* 系列变量并完成 SDK 对接');
    }
    throw new Error(`支付宝 SDK 对接待实现，订单 ${payload.orderNo} 已创建，请补充 alipay-sdk 调用`);
  }

  async queryOrder() {
    if (!this.isConfigured()) throw new Error('支付宝渠道未配置');
    throw new Error('支付宝查单逻辑待实现，请补充 alipay-sdk 调用');
  }

  async verifyNotify() {
    if (!this.isConfigured()) throw new Error('支付宝渠道未配置');
    throw new Error('支付宝回调验签待实现，请补充 RSA2 验签逻辑');
  }

  async parseNotifyResult() {
    throw new Error('支付宝回调解析待实现');
  }

  buildNotifyResponse() {
    return 'success';
  }
}
