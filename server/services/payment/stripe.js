import { config } from '../../config.js';
import { BasePaymentAdapter } from './base.js';

/**
 * Stripe 适配器（占位，适用于海外/信用卡场景）。
 * 接入步骤：
 *   1. 在 .env 填入 PAY_STRIPE_SECRET_KEY / PAY_STRIPE_WEBHOOK_SECRET
 *   2. 安装 stripe（npm i stripe）
 *   3. 在本文件实现 createPayment（Checkout Session / PaymentIntent）与 verifyNotify（webhook 签名）
 *   4. 将 PAY_DEFAULT_CHANNEL 切换为 stripe
 */
export class StripeAdapter extends BasePaymentAdapter {
  constructor() {
    super('stripe');
    this.cfg = config.payment.stripe;
  }

  isConfigured() {
    return !!(this.cfg.secretKey && this.cfg.webhookSecret);
  }

  async createPayment(payload) {
    if (!this.isConfigured()) {
      throw new Error('Stripe 渠道未配置：请在 .env 填入 PAY_STRIPE_* 系列变量并安装 stripe SDK');
    }
    throw new Error(`Stripe SDK 对接待实现，订单 ${payload.orderNo} 已创建，请补充 stripe.checkout.sessions 调用`);
  }

  async queryOrder() {
    if (!this.isConfigured()) throw new Error('Stripe 渠道未配置');
    throw new Error('Stripe 查单逻辑待实现，请补充 stripe.paymentIntents.retrieve 调用');
  }

  async verifyNotify() {
    if (!this.isConfigured()) throw new Error('Stripe 渠道未配置');
    throw new Error('Stripe webhook 验签待实现，请补充 stripe.webhooks.constructEvent 逻辑');
  }

  async parseNotifyResult() {
    throw new Error('Stripe webhook 解析待实现');
  }

  buildNotifyResponse() {
    return { received: true };
  }
}
