import { Router } from 'express';
import { query, queryOne, update } from '../../db.js';
import { audit } from '../../services/audit-log.service.js';

const router = Router();

// 用户对外可见字段白名单（严禁泄露 password_hash / token_version / wechat_openid 等）
const USER_SAFE_FIELDS = `u.id, u.phone, u.nickname, u.avatar, u.company, u.category, u.bio,
  u.invite_code, u.invited_by, u.status, u.credit_score, u.created_at, u.updated_at,
  u.deleted_at, u.email, u.qualifications, u.cases`;

// 获取用户列表
router.get('/', async (req, res) => {
  try {
    const { status, keyword, page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let sql = `SELECT ${USER_SAFE_FIELDS}, pa.balance as points_balance, uls.level
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
      `SELECT ${USER_SAFE_FIELDS}, pa.balance as points_balance, uls.level
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
/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   put:
 *     tags: [后台-用户管理]
 *     summary: 编辑用户
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 成功
 */
router.put('/:id', audit('users', 'edit'), async (req, res) => {
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
/**
 * @swagger
 * /api/v1/admin/users/{id}/points:
 *   put:
 *     tags: [后台-用户管理]
 *     summary: 调整积分
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 成功
 */
router.put('/:id/points', audit('points', 'adjust_points'), async (req, res) => {
  try {
    const { delta, reason } = req.body || {};
    if (typeof delta !== 'number' || !Number.isFinite(delta)) {
      return res.json({ code: 400, message: '请填写调整积分' });
    }
    if (!reason) {
      return res.json({ code: 400, message: '请填写调整原因' });
    }

    const userId = req.params.id;

    // delta = 0 表示清零余额（此前 !delta 校验误拦截，且语义与"调整"冲突）
    let finalDelta = delta;
    if (delta === 0) {
      const current = await queryOne('SELECT balance FROM points_accounts WHERE user_id = ?', [userId]);
      finalDelta = -Math.abs(current?.balance || 0);
      if (finalDelta === 0) {
        return res.json({ code: 0, message: '余额已为 0，无需调整' });
      }
    }

    // 检查余额
    if (finalDelta < 0) {
      const account = await queryOne('SELECT balance FROM points_accounts WHERE user_id = ?', [userId]);
      if ((account?.balance || 0) < Math.abs(finalDelta)) {
        return res.json({ code: 400, message: '余额不足' });
      }
    }

    // 确保积分账户存在，再更新积分
    await query(
      'INSERT INTO points_accounts (user_id, balance) VALUES (?, ?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)',
      [userId, 0]
    );
    await query('UPDATE points_accounts SET balance = balance + ? WHERE user_id = ?', [finalDelta, userId]);

    const account = await queryOne('SELECT balance FROM points_accounts WHERE user_id = ?', [userId]);

    // 记录流水
    await query(
      `INSERT INTO points_logs (user_id, delta, balance_after, source_type, source_title)
       VALUES (?, ?, ?, 'admin_adjust', ?)`,
      [userId, finalDelta, account?.balance ?? 0, reason]
    );

    res.json({ code: 0, message: '积分调整成功' });
  } catch (err) {
    console.error('Admin adjust points error:', err);
    res.status(500).json({ code: 500, message: '调整积分失败' });
  }
});

// 调整用户信用分
/**
 * @swagger
 * /api/v1/admin/users/{id}/credit:
 *   put:
 *     tags: [后台-用户管理]
 *     summary: 调整信用分
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 成功
 */
router.put('/:id/credit', audit('users', 'adjust_credits'), async (req, res) => {
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
