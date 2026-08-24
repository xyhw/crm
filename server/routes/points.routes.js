import { Router } from 'express';
import { query, queryOne, insert, transaction } from '../db.js';
import { authRequired } from '../auth.js';
import { config } from '../config.js';
import {
  createRechargeOrder,
  settleRechargeOrder,
  getOrderForUser,
  getAdapter,
  listAvailableChannels,
} from '../services/payment/index.js';

const router = Router();

// 获取积分余额
router.get('/balance', authRequired, async (req, res) => {
  try {
    const account = await queryOne(
      'SELECT * FROM points_accounts WHERE user_id = ?',
      [req.userId]
    );
    
    res.json({
      code: 0,
      data: account || { balance: 0, total_recharged: 0, total_consumed: 0, total_expired: 0 },
    });
  } catch (err) {
    console.error('Get balance error:', err);
    res.status(500).json({ code: 500, message: '获取积分余额失败' });
  }
});

// 获取积分流水
router.get('/logs', authRequired, async (req, res) => {
  try {
    const { type, page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let sql = 'SELECT * FROM points_logs WHERE user_id = ?';
    const params = [req.userId];

    if (type === 'income') {
      sql += ' AND delta > 0';
    } else if (type === 'expense') {
      sql += ' AND delta < 0';
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(pageSize), offset);

    const list = await query(sql, params);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM points_logs WHERE user_id = ?';
    const countParams = [req.userId];
    if (type === 'income') {
      countSql += ' AND delta > 0';
    } else if (type === 'expense') {
      countSql += ' AND delta < 0';
    }
    const [countResult] = await query(countSql, countParams);

    res.json({
      code: 0,
      data: {
        list: list.map(item => ({
          ...item,
          deltaLabel: item.delta > 0 ? `+${item.delta}` : `${item.delta}`,
        })),
        total: countResult.total,
        page: Number(page),
        pageSize: Number(pageSize),
      },
    });
  } catch (err) {
    console.error('Get points logs error:', err);
    res.status(500).json({ code: 500, message: '获取积分流水失败' });
  }
});

// 创建充值订单（发起支付）
router.post('/recharge', authRequired, async (req, res) => {
  try {
    const { amount, channel } = req.body || {};
    const result = await createRechargeOrder({
      userId: req.userId,
      amount: Number(amount),
      channel: channel || config.payment.defaultChannel,
    });
    res.json({ code: 0, data: result, message: '订单已创建，请完成支付' });
  } catch (err) {
    if (err.code) return res.json({ code: err.code, message: err.message });
    console.error('Create recharge order error:', err);
    res.status(500).json({ code: 500, message: '创建充值订单失败' });
  }
});

// 查询充值订单状态（前端轮询支付结果）
router.get('/recharge/order/:orderNo', authRequired, async (req, res) => {
  try {
    let order = await getOrderForUser(req.params.orderNo, req.userId);
    if (!order) return res.json({ code: 404, message: '订单不存在' });

    // pending 且超过有效期 -> 标记过期（渠道侧不通知失败/取消时，前端据此感知超时）
    if (order.status === 'pending' && order.expire_at && new Date(order.expire_at) < new Date()) {
      await query(
        `UPDATE payment_orders SET status = 'expired' WHERE order_no = ? AND status = 'pending'`,
        [req.params.orderNo]
      );
      order = await getOrderForUser(req.params.orderNo, req.userId);
    }

    // pending 状态尝试主动对账渠道侧
    if (order.status === 'pending') {
      try {
        const adapter = getAdapter(order.channel);
        const result = await adapter.queryOrder({ orderNo: order.order_no, payChannelOrderNo: order.pay_channel_order_no });
        if (result.status === 'paid') {
          await settleRechargeOrder(order.order_no, {
            payChannelOrderNo: order.pay_channel_order_no,
            paidAt: result.paidAt,
            rawNotify: result.raw,
          });
          const fresh = await getOrderForUser(req.params.orderNo, req.userId);
          return res.json({ code: 0, data: fresh });
        }
      } catch {
        // 渠道查单失败（占位未实现）则忽略，按订单当前状态返回
      }
    }
    res.json({ code: 0, data: order });
  } catch (err) {
    console.error('Query recharge order error:', err);
    res.status(500).json({ code: 500, message: '查询订单失败' });
  }
});

// 模拟支付完成（仅 mock 渠道，开发联调用）
router.post('/recharge/mock-pay/:orderNo', authRequired, async (req, res) => {
  try {
    const order = await getOrderForUser(req.params.orderNo, req.userId);
    if (!order) return res.json({ code: 404, message: '订单不存在' });
    if (order.channel !== 'mock') return res.json({ code: 400, message: '该订单渠道非 mock，无法模拟支付' });
    if (order.status !== 'pending') return res.json({ code: 0, data: order, message: '订单已处理' });

    const settled = await settleRechargeOrder(order.order_no, {
      payChannelOrderNo: `MOCK${Date.now()}`,
      paidAt: new Date(),
      rawNotify: { mock: true, orderNo: order.order_no },
    });
    const fresh = await getOrderForUser(req.params.orderNo, req.userId);
    res.json({ code: 0, data: fresh, message: settled.already ? '订单已支付过' : '模拟支付成功' });
  } catch (err) {
    if (err.code) return res.json({ code: err.code, message: err.message });
    console.error('Mock pay error:', err);
    res.status(500).json({ code: 500, message: '模拟支付失败' });
  }
});

// 支付渠道回调 webhook（渠道服务器调用，无需登录态）
router.post('/recharge/notify/:channel', async (req, res) => {
  const channel = req.params.channel;
  let adapter;
  try {
    adapter = getAdapter(channel);
  } catch {
    return res.status(400).json({ code: 400, message: `不支持的渠道: ${channel}` });
  }

  let verified = false;
  try {
    verified = await adapter.verifyNotify(req.headers, req.body);
  } catch (err) {
    console.error(`[${channel}] verifyNotify not implemented:`, err.message);
  }
  if (!verified) return res.status(400).json({ code: 400, message: '回调验签失败' });

  try {
    const result = await adapter.parseNotifyResult(req.headers, req.body);
    if (!result.orderNo) return res.status(400).json({ code: 400, message: '回调缺少订单号' });

    await settleRechargeOrder(result.orderNo, {
      payChannelOrderNo: result.payChannelOrderNo,
      paidAt: result.paidAt,
      rawNotify: result.raw,
    });
    res.json(adapter.buildNotifyResponse());
  } catch (err) {
    console.error(`[${channel}] notify handle error:`, err);
    res.status(500).json(adapter.buildNotifyResponse());
  }
});

// 可用支付渠道列表（前端渲染渠道选择）
router.get('/recharge/channels', authRequired, (_req, res) => {
  res.json({ code: 0, data: { channels: listAvailableChannels(), defaultChannel: config.payment.defaultChannel } });
});

export default router;
