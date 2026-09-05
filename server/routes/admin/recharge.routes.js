import { Router } from 'express';
import { query, queryOne } from '../../db.js';
import { getAdapter, settleRechargeOrder, refundRechargeOrder } from '../../services/payment/index.js';
import { recordLog } from '../../services/audit-log.service.js';
import { pickBodyFields } from '../../utils/body-fields.js';

const router = Router();

const ALLOWED_STATUS = ['pending', 'paid', 'failed', 'expired', 'refunded'];
const ALLOWED_CHANNEL = ['mock', 'wechat', 'alipay', 'stripe', 'waffo'];

/**
 * 充值订单（payment_orders）后台对账。
 * 与 MP 后台/渠道账单核对，并对回调丢失的 pending 单手动查单补账。
 */
router.get('/', async (req, res) => {
  try {
    const { status, channel, keyword, orderNo, page = 1, pageSize = 20 } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const size = Math.min(100, Math.max(1, Number(pageSize) || 20));
    const offset = (pageNum - 1) * size;

    const where = ['1=1'];
    const params = [];
    if (status && ALLOWED_STATUS.includes(status)) {
      where.push('po.status = ?');
      params.push(status);
    }
    if (channel && ALLOWED_CHANNEL.includes(channel)) {
      where.push('po.channel = ?');
      params.push(channel);
    }
    if (orderNo) {
      where.push('(po.order_no = ? OR po.pay_channel_order_no = ?)');
      params.push(String(orderNo).trim(), String(orderNo).trim());
    }
    if (keyword) {
      where.push('(u.nickname LIKE ? OR u.phone LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    const whereSql = where.join(' AND ');

    const list = await query(
      `SELECT po.id, po.order_no, po.user_id, po.amount, po.price, po.channel, po.status,
              po.pay_channel_order_no, po.pay_method, po.paid_at, po.expire_at,
              po.refund_amount, po.refunded_at, po.created_at,
              u.nickname AS user_name, u.phone AS user_phone
       FROM payment_orders po
       LEFT JOIN users u ON u.id = po.user_id
       WHERE ${whereSql}
       ORDER BY po.id DESC
       LIMIT ${size} OFFSET ${offset}`,
      params
    );

    const [countRow] = await query(
      `SELECT COUNT(*) AS total FROM payment_orders po
       LEFT JOIN users u ON u.id = po.user_id
       WHERE ${whereSql}`,
      params
    );

    res.json({
      code: 0,
      data: { list, total: countRow?.total || 0, page: pageNum, pageSize: size },
    });
  } catch (err) {
    console.error('Admin get recharge orders error:', err);
    res.status(500).json({ code: 500, message: '获取充值订单失败' });
  }
});

/** 对账汇总：按状态与渠道统计笔数与金额（price 单位分） */
router.get('/summary', async (req, res) => {
  try {
    const [byStatus, byChannel, today] = await Promise.all([
      query(
        `SELECT status, COUNT(*) AS orders, COALESCE(SUM(price), 0) AS price, COALESCE(SUM(amount), 0) AS points
         FROM payment_orders GROUP BY status`
      ),
      query(
        `SELECT channel, COUNT(*) AS orders, COALESCE(SUM(price), 0) AS price, COALESCE(SUM(amount), 0) AS points
         FROM payment_orders WHERE status = 'paid' GROUP BY channel`
      ),
      query(
        `SELECT COUNT(*) AS orders, COALESCE(SUM(price), 0) AS price, COALESCE(SUM(amount), 0) AS points
         FROM payment_orders WHERE status = 'paid' AND DATE(paid_at) = CURDATE()`
      ),
    ]);

    // 已支付订单与其积分流水逐单对账：points_logs.source_id 指向 payment_orders.id
    const [ledger] = await query(
      `SELECT COALESCE(SUM(pl.delta), 0) AS points
       FROM points_logs pl
       JOIN payment_orders po ON po.id = pl.source_id
       WHERE pl.source_type = 'recharge' AND po.status = 'paid'`
    );
    const [missing] = await query(
      `SELECT COUNT(*) AS orders, COALESCE(SUM(po.amount), 0) AS points
       FROM payment_orders po
       WHERE po.status = 'paid'
         AND NOT EXISTS (
           SELECT 1 FROM points_logs pl
           WHERE pl.source_type = 'recharge' AND pl.source_id = po.id
         )`
    );
    // 退款为人工登记：核对 refunded 订单是否都写了 refund 流水
    const [refund] = await query(
      `SELECT COUNT(*) AS orders,
              COALESCE(SUM(po.refund_amount), 0) AS refundPrice,
              COALESCE(SUM(po.amount), 0) AS points
       FROM payment_orders po WHERE po.status = 'refunded'`
    );
    const [refundMissing] = await query(
      `SELECT COUNT(*) AS orders, COALESCE(SUM(po.amount), 0) AS points
       FROM payment_orders po
       WHERE po.status = 'refunded'
         AND NOT EXISTS (
           SELECT 1 FROM points_logs pl
           WHERE pl.source_type = 'refund' AND pl.source_id = po.id
         )`
    );
    const paid = byStatus.find((r) => r.status === 'paid');
    const paidPoints = Number(paid?.points || 0);
    const ledgerPoints = Number(ledger?.points || 0);

    res.json({
      code: 0,
      data: {
        byStatus,
        byChannel,
        today: today[0] || { orders: 0, price: 0, points: 0 },
        refund: {
          orders: Number(refund?.orders || 0),
          refundPrice: Number(refund?.refundPrice || 0),
          points: Number(refund?.points || 0),
          missingLedgerOrders: Number(refundMissing?.orders || 0),
          missingLedgerPoints: Number(refundMissing?.points || 0),
        },
        reconcile: {
          paidOrderPoints: paidPoints,
          ledgerRechargePoints: ledgerPoints,
          diff: paidPoints - ledgerPoints,
          missingLedgerOrders: Number(missing?.orders || 0),
          missingLedgerPoints: Number(missing?.points || 0),
        },
      },
    });
  } catch (err) {
    console.error('Admin recharge summary error:', err);
    res.status(500).json({ code: 500, message: '获取充值对账汇总失败' });
  }
});

/**
 * 手动查单补账：仅处理 pending 单，向渠道查真实状态，已支付则幂等入账。
 * 用于发货推送丢失、定时兜底未覆盖（超 2 天）的场景。
 */
router.post('/:orderNo/sync', async (req, res) => {
  const { orderNo } = req.params;
  try {
    const order = await queryOne('SELECT * FROM payment_orders WHERE order_no = ?', [orderNo]);
    if (!order) return res.json({ code: 404, message: '订单不存在' });
    if (order.status === 'paid') {
      return res.json({ code: 0, data: { status: 'paid', already: true }, message: '订单已入账' });
    }
    if (order.status !== 'pending') {
      return res.json({ code: 400, message: `订单状态为 ${order.status}，不支持查单补账` });
    }

    const adapter = getAdapter(order.channel);
    if (typeof adapter.isConfigured === 'function' && !adapter.isConfigured()) {
      return res.json({ code: 400, message: `渠道 ${order.channel} 未配置，无法查单` });
    }
    const user = await queryOne('SELECT wechat_openid FROM users WHERE id = ?', [order.user_id]);
    const result = await adapter.queryOrder({
      orderNo: order.order_no,
      payChannelOrderNo: order.pay_channel_order_no,
      openid: user?.wechat_openid,
    });

    if (result.status !== 'paid') {
      return res.json({
        code: 0,
        data: { status: result.status || 'pending', settled: false },
        message: '渠道侧未支付，未做入账',
      });
    }

    const settled = await settleRechargeOrder(order.order_no, {
      payChannelOrderNo: result.payChannelOrderNo || order.pay_channel_order_no,
      paidAt: result.paidAt,
      rawNotify: result.raw,
    });
    await recordLog(
      req.adminId,
      'recharge_sync',
      'payment_order',
      order.id,
      { orderNo: order.order_no, channel: order.channel, amount: order.amount, already: settled.already },
      req.ip
    );
    res.json({
      code: 0,
      data: { status: 'paid', settled: !settled.already },
      message: settled.already ? '订单已入账' : '查单成功，已补记积分',
    });
  } catch (err) {
    if (err.code === 404) return res.json({ code: 404, message: err.message });
    console.error('Admin recharge sync error:', err);
    res.status(500).json({ code: 500, message: err.message || '查单补账失败' });
  }
});

/**
 * 退款记账（人工操作）。系统不调用渠道退款接口：
 * 运营先在渠道后台完成退款，再在此登记，扣回积分并留痕。
 */
router.post('/:orderNo/refund', async (req, res) => {
  const { orderNo } = req.params;
  const { reason, channelRefundNo } = pickBodyFields(req.body, ['reason', 'channelRefundNo']);
  try {
    if (!reason || String(reason).trim().length < 2) {
      return res.json({ code: 400, message: '请填写退款原因（至少 2 个字）' });
    }
    const result = await refundRechargeOrder(orderNo, {
      reason: String(reason).trim(),
      operatorId: req.adminId,
      channelRefundNo: channelRefundNo ? String(channelRefundNo).trim() : null,
    });
    if (result.already) {
      return res.json({ code: 0, data: result, message: '该订单已登记退款' });
    }
    await recordLog(
      req.adminId,
      'recharge_refund',
      'payment_order',
      result.orderId,
      {
        orderNo: result.orderNo,
        userId: result.userId,
        points: result.points,
        refundAmount: result.refundAmount,
        balanceBefore: result.balanceBefore,
        balanceAfter: result.balanceAfter,
        shortfall: result.shortfall,
        channelRefundNo: channelRefundNo || null,
        reason: String(reason).trim(),
      },
      req.ip
    );
    res.json({
      code: 0,
      data: result,
      message: result.shortfall > 0
        ? `已登记退款，用户余额不足 ${result.shortfall} 积分，余额已扣为负值`
        : '已登记退款并扣回积分',
    });
  } catch (err) {
    if (err.code === 404 || err.code === 400) {
      return res.json({ code: err.code, message: err.message });
    }
    console.error('Admin recharge refund error:', err);
    res.status(500).json({ code: 500, message: err.message || '退款记账失败' });
  }
});

export default router;
