import { config } from '../../config.js';

/**
 * 支付适配器基类，定义各渠道需实现的统一接口。
 * 每个渠道只需实现 createPayment / verifyNotify / parseNotifyResult 三个方法，
 * 即可被 PaymentService 统一调度，后续接入真实渠道时只替换对应适配器实现。
 */
export class BasePaymentAdapter {
  constructor(channel) {
    this.channel = channel;
    this.name = channel;
  }

  /**
   * 创建支付订单，向渠道方发起下单请求。
   * @param {{orderNo:string, amount:number, price:number, subject:string, userId:number, method?:string, openid?:string}} payload
   * @returns {Promise<{payUrl?:string, prepaidId?:string, payData?:object, payMethod:string}>}
   */
  async createPayment(/* payload */) {
    throw new Error(`${this.channel} adapter: createPayment not implemented`);
  }

  /**
   * 查询渠道方订单真实状态（主动对账用）。
   * @param {{orderNo:string, payChannelOrderNo?:string}} meta
   * @returns {Promise<{status:'paid'|'pending'|'failed', paidAt?:Date, raw?:object}>}
   */
  async queryOrder(/* meta */) {
    throw new Error(`${this.channel} adapter: queryOrder not implemented`);
  }

  /**
   * 验证渠道回调通知签名/合法性，返回是否合法。
   * @param {object} headers HTTP 请求头
   * @param {string|object} rawBody 原始请求体
   * @returns {Promise<boolean>}
   */
  async verifyNotify(/* headers, rawBody */) {
    throw new Error(`${this.channel} adapter: verifyNotify not implemented`);
  }

  /**
   * 解析回调通知，提取订单号、渠道订单号、支付金额等结构化结果。
   * @param {object} headers
   * @param {string|object} rawBody
   * @returns {Promise<{orderNo:string, payChannelOrderNo?:string, paidAmount?:number, paidAt?:Date, raw?:object}>}
   */
  async parseNotifyResult(/* headers, rawBody */) {
    throw new Error(`${this.channel} adapter: parseNotifyResult not implemented`);
  }

  /**
   * 回调应答内容，渠道要求返回特定格式表示已收到。
   * @returns {string|object}
   */
  buildNotifyResponse() {
    return { code: 0, message: 'success' };
  }

  /** 工具：生成订单号 前缀+时间戳+随机 */
  static genOrderNo(prefix = 'R') {
    const ts = Date.now();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${ts}${rand}`;
  }

  /** 工具：积分换算为分（支付金额单位） */
  pointsToFen(amount) {
    return Math.round(amount * config.payment.pointsToYuan * 100);
  }
}
