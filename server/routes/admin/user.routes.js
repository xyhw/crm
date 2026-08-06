import { Router } from 'express';
import { query, queryOne, update } from '../../db.js';

const router = Router();

// 获取用户列表
router.get('/', async (req, res) => {
  try {
    const { status, keyword, page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let sql = `SELECT u.*, pa.balance as points_balance, uls.level
               FROM users u
               LEFT JOIN points_accounts pa ON u.id = pa.user_id
               LEFT JOIN user_level_stats uls ON u.id = uls.user_id
               WHERE u.deleted_at IS NULL`;
    const params = [];

    if (status) {
      sql += ' AND u.status = ?';
      params.push(status);
    }
    if (keyword) {
      sql += ' AND (u.nickname LIKE ? OR u.phone LIKE ? OR u.company LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(pageSize), offset);

    const list = await query(sql, params);

    const [countResult] = await query('SELECT COUNT(*) as total FROM users WHERE deleted_at IS NULL', []);

    res.json({
      code: 0,
      data: {
        list,
        total: countResult.total,
        page: Number(page),
        pageSize: Number(pageSize),
      },
    });
  } catch (err) {
    console.error('Admin get users error:', err);
    res.status(500).json({ code: 500, message: '获取用户列表失败' });
  }
});

// 获取用户详情
router.get('/:id', async (req, res) => {
  try {
    const user = await queryOne(
      `SELECT u.*, pa.balance as points_balance, uls.level
       FROM users u
       LEFT JOIN points_accounts pa ON u.id = pa.user_id
       LEFT JOIN user_level_stats uls ON u.id = uls.user_id
       WHERE u.id = ? AND u.deleted_at IS NULL`,
      [req.params.id]
    );

    if (!user) {
      return res.json({ code: 404, message: '用户不存在' });
    }

    // 获取信用分记录
    const creditLogs = await query(
      'SELECT * FROM user_credits WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [req.params.id]
    );

    res.json({
      code: 0,
      data: {
        ...user,
        creditLogs,
      },
    });
  } catch (err) {
    console.error('Admin get user detail error:', err);
    res.status(500).json({ code: 500, message: '获取用户详情失败' });
  }
});

// 编辑用户基础信息
router.put('/:id', async (req, res) => {
  try {
    const { nickname, company } = req.body || {};
    const data = {};
    if (nickname !== undefined) data.nickname = nickname;
    if (company !== undefined) data.company = company;
    if (Object.keys(data).length === 0) {
      return res.json({ code: 400, message: '没有可更新的字段' });
    }

    await update('users', data, 'id = ? AND deleted_at IS NULL', [req.params.id]);
    res.json({ code: 0, message: '用户信息已更新' });
  } catch (err) {
    console.error('Admin update user error:', err);
    res.status(500).json({ code: 500, message: '更新用户失败' });
  }
});

// 调整用户积分
router.put('/:id/points', async (req, res) => {
  try {
    const { delta, reason } = req.body || {};
    if (!delta || !reason) {
      return res.json({ code: 400, message: '请填写调整积分和原因' });
    }

    const userId = req.params.id;
    
    // 检查余额
    if (delta < 0) {
      const [account] = await query('SELECT balance FROM points_accounts WHERE user_id = ?', [userId]);
      if ((account[0]?.balance || 0) < Math.abs(delta)) {
        return res.json({ code: 400, message: '余额不足' });
      }
    }

    // 更新积分
    await query('UPDATE points_accounts SET balance = balance + ? WHERE user_id = ?', [delta, userId]);

    const [account] = await query('SELECT balance FROM points_accounts WHERE user_id = ?', [userId]);

    // 记录流水
    await query(
      `INSERT INTO points_logs (user_id, delta, balance_after, source_type, source_title)
       VALUES (?, ?, ?, 'admin_adjust', ?)`,
      [userId, delta, account[0].balance, reason]
    );

    res.json({ code: 0, message: '积分调整成功' });
  } catch (err) {
    console.error('Admin adjust points error:', err);
    res.status(500).json({ code: 500, message: '调整积分失败' });
  }
});

// 调整用户信用分
router.put('/:id/credit', async (req, res) => {
  try {
    const { delta, reason } = req.body || {};
    if (!delta || !reason) {
      return res.json({ code: 400, message: '请填写调整分数和原因' });
    }

    const userId = req.params.id;

    // 更新信用分
    await query('UPDATE users SET credit_score = GREATEST(0, LEAST(100, credit_score + ?)) WHERE id = ?', [delta, userId]);

    const [user] = await query('SELECT credit_score FROM users WHERE id = ?', [userId]);

    // 记录
    await query(
      `INSERT INTO user_credits (user_id, credit_score, change_amount, change_reason, source_type)
       VALUES (?, ?, ?, ?, 'admin_adjust')`,
      [userId, user.credit_score, delta, reason]
    );

    res.json({ code: 0, message: '信用分调整成功' });
  } catch (err) {
    console.error('Admin adjust credit error:', err);
    res.status(500).json({ code: 500, message: '调整信用分失败' });
  }
});

export default router;
