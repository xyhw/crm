import { Router } from 'express';
import { query, queryOne, insert, transaction } from '../db.js';
import { authRequired } from '../auth.js';

const router = Router();

// 获取积分余额
router.get('/balance', authRequired, async (req, res) => {
  try {
    const [account] = await query(
      'SELECT * FROM points_accounts WHERE user_id = ?',
      [req.userId]
    );
    
    res.json({
      code: 0,
      data: account[0] || { balance: 0, total_recharged: 0, total_consumed: 0, total_expired: 0 },
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

// 充值积分（Mock 模式）
router.post('/recharge', authRequired, async (req, res) => {
  try {
    const { amount } = req.body || {};
    
    if (!amount || amount <= 0) {
      return res.json({ code: 400, message: '请输入有效的充值金额' });
    }

    // 检查充值上限
    const [limitConfig] = await query(
      "SELECT config_value FROM system_configs WHERE config_key = 'points_recharge_limit'"
    );
    const limit = parseInt(limitConfig[0]?.config_value || '10000');
    
    if (amount > limit) {
      return res.json({ code: 400, message: `单次充值上限为 ${limit} 积分` });
    }

    await transaction(async (conn) => {
      // 增加积分
      await conn.execute(
        'UPDATE points_accounts SET balance = balance + ?, total_recharged = total_recharged + ? WHERE user_id = ?',
        [amount, amount, req.userId]
      );

      const [account] = await conn.execute(
        'SELECT balance FROM points_accounts WHERE user_id = ?',
        [req.userId]
      );

      // 记录流水
      await conn.execute(
        `INSERT INTO points_logs (user_id, delta, balance_after, source_type, source_title)
         VALUES (?, ?, ?, 'recharge', '积分充值')`,
        [req.userId, amount, account[0].balance]
      );
    });

    res.json({
      code: 0,
      data: { amount },
      message: '充值成功',
    });
  } catch (err) {
    console.error('Recharge error:', err);
    res.status(500).json({ code: 500, message: '充值失败' });
  }
});

export default router;
