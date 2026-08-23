import { config } from '../../config.js';
import { BasePaymentAdapter } from './base.js';

/**
 * Mock 支付适配器：开发联调用，无需真实渠道。
 * createPayment 直接返回一个模拟支付链接；
 * 若 PAY_MOCK_AUTOPAY !== 'false'，则下单后立即视为支付成功，
 * 前端可直接调用"模拟支付完成"接口或轮询订单状态看到 paid。
 * 接入真实渠道后，只需在 PaymentService 工厂里把 defaultChannel 切换为 wechat/alipay/stripe 即可。
 */
export class MockAdapter extends BasePaymentAdapter {
  constructor() {
    super('mock');
  }

  async createPayment({ orderNo, price }) {
    const payUrl = `mock://pay?order=${orderNo}&amount=${price}`;
    return {
      payUrl,
      payMethod: config.payment.mockAutoPay ? 'auto' : 'manual',
    };
  }

  async queryOrder({ orderNo }) {
    return {
      status: config.payment.mockAutoPay ? 'paid' : 'pending',
      paidAt: config.payment.mockAutoPay ? new Date() : null,
      raw: { orderNo, mock: true },
    };
  }

  async verifyNotify() {
    return true;
  }

  async parseNotifyResult(_headers, rawBody) {
    let body = rawBody;
    if (typeof rawBody === 'string') {
      try { body = JSON.parse(rawBody); } catch { body = { raw: rawBody }; }
    }
    return {
      orderNo: body?.orderNo || body?.out_trade_no || '',
      payChannelOrderNo: body?.transaction_id || body?.trade_no || `MOCK${Date.now()}`,
      paidAmount: body?.paidAmount || null,
      paidAt: body?.paidAt ? new Date(body.paidAt) : new Date(),
      raw: body,
    };
  }
}
