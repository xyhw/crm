import { config } from '../../config.js';
import { query, queryOne, transaction } from '../../db.js';
import { BasePaymentAdapter } from './base.js';
import { MockAdapter } from './mock.js';
import { WechatAdapter } from './wechat.js';
import { AlipayAdapter } from './alipay.js';
import { StripeAdapter } from './stripe.js';
import { WaffoAdapter } from './waffo.js';

const ADAPTERS = {
  mock: () => new MockAdapter(),
  wechat: () => new WechatAdapter(),
  alipay: () => new AlipayAdapter(),
  stripe: () => new StripeAdapter(),
  waffo: () => new WaffoAdapter(),
};

/** 按渠道名获取适配器实例（单例缓存） */
const cache = {};
export function getAdapter(channel) {
  const key = channel || config.payment.defaultChannel;
  if (!ADAPTERS[key]) throw new Error(`不支持的支付渠道: ${key}`);
  if (!cache[key]) cache[key] = ADAPTERS[key]();
  return cache[key];
}

/** 列出当前可用的渠道：各渠道均需后台开关开启且配置齐全 */
export function listAvailableChannels() {
  return Object.keys(ADAPTERS).filter((c) => {
    const enabled = config.payment._channelEnabled?.[c];
    if (enabled === false) return false;
    const a = getAdapter(c);
    return typeof a.isConfigured === 'function' && a.isConfigured();
  });
}

export { BasePaymentAdapter };

/**
 * 创建充值订单并发起支付。
 * 返回订单与支付参数，前端据此拉起支付。
 */
export async function createRechargeOrder({ userId, amount, channel }) {
  if (!amount || amount <= 0) {
    const err = new Error('请输入有效的充值金额');
    err.code = 400;
    throw err;
  }
  const [limitRow] = await query(
    "SELECT config_value FROM system_configs WHERE config_key = 'points_recharge_limit'"
  );
  const limit = parseInt(limitRow?.config_value || '10000', 10);
  if (amount > limit) {
    const err = new Error(`单次充值上限为 ${limit} 积分`);
    err.code = 400;
    throw err;
  }

  const adapter = getAdapter(channel);
  if (adapter.channel === 'mock' && process.env.NODE_ENV === 'production') {
    const err = new Error('生产环境不提供 mock 支付渠道');
    err.code = 403;
    throw err;
  }
  const orderNo = BasePaymentAdapter.genOrderNo();
  const price = adapter.pointsToFen(amount);
  const now = new Date();
  const expireAt = new Date(now.getTime() + config.payment.orderTtl * 1000);

  // 先落库 pending 订单
  await query(
    `INSERT INTO payment_orders (order_no, user_id, amount, price, channel, status, expire_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    [orderNo, userId, amount, price, adapter.channel, expireAt]
  );

  // 获取用户邮箱（用于 Waffo 等渠道预填 buyerEmail）
  const [userRow] = await query('SELECT email FROM users WHERE id = ?', [userId]);
  const userEmail = userRow?.email || null;

  const pay = await adapter.createPayment({
    orderNo, amount, price, subject: '积分充值', userId, email: userEmail,
  });

  // 记录渠道返回的支付参数
  await query(
    `UPDATE payment_orders SET pay_url = ?, prepaid_id = ?, pay_method = ? WHERE order_no = ?`,
    [pay.payUrl || null, pay.prepaidId || null, pay.payMethod || null, orderNo]
  );

  return { orderNo, amount, price, channel: adapter.channel, ...pay };
}

/**
 * 充值成功后幂等加积分：同订单多次回调只入账一次。
 */
export async function settleRechargeOrder(orderNo, { payChannelOrderNo, paidAt, rawNotify }) {
  return transaction(async (conn) => {
    const [rows] = await conn.execute(
      'SELECT * FROM payment_orders WHERE order_no = ? FOR UPDATE',
      [orderNo]
    );
    const order = rows[0];
    if (!order) {
      const err = new Error(`订单不存在: ${orderNo}`);
      err.code = 404;
      throw err;
    }
    if (order.status === 'paid') return { orderNo, already: true };
    if (order.status !== 'pending') {
      const err = new Error(`订单状态非 pending，无法入账: ${order.status}`);
      err.code = 400;
      throw err;
    }

    await conn.execute(
      `UPDATE payment_orders SET status = 'paid', pay_channel_order_no = ?, paid_at = ?, raw_notify = ? WHERE order_no = ?`,
      [payChannelOrderNo || null, paidAt || new Date(), JSON.stringify(rawNotify || null), orderNo]
    );

    await conn.execute(
      'UPDATE points_accounts SET balance = balance + ?, total_recharged = total_recharged + ? WHERE user_id = ?',
      [order.amount, order.amount, order.user_id]
    );

    const [acct] = await conn.execute(
      'SELECT balance FROM points_accounts WHERE user_id = ?',
      [order.user_id]
    );
    await conn.execute(
      `INSERT INTO points_logs (user_id, delta, balance_after, source_type, source_title, source_id)
       VALUES (?, ?, ?, 'recharge', '积分充值', ?)`,
      [order.user_id, order.amount, acct[0].balance, order.id]
    );

    return { orderNo, already: false, userId: order.user_id, amount: order.amount };
  });
}

/** 查询订单（含主动对账：渠道侧查单） */
export async function getOrderForUser(orderNo, userId) {
  const order = await queryOne(
    'SELECT * FROM payment_orders WHERE order_no = ? AND user_id = ?',
    [orderNo, userId]
  );
  return order;
}
