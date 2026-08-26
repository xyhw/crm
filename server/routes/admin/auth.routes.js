import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryOne } from '../../db.js';
import { config } from '../../config.js';
import { loginLimiter } from '../../middleware/rate-limit.js';
import { isAccountLocked, recordLoginFailure, clearLoginFailures } from '../../services/account-lock.service.js';

const router = Router();
const ADMIN_SECRET = config.adminSecret;

/**
 * @swagger
 * /api/v1/admin/auth/login:
 *   post:
 *     tags: [后台-认证]
 *     summary: 管理员登录
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: 成功返回token
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    
    if (!username || !password) {
      return res.json({ code: 400, message: '请输入用户名和密码' });
    }

    const admin = await queryOne(
      'SELECT * FROM admin_users WHERE username = ? AND status = "active"',
      [username]
    );
    if (!admin) {
      return res.json({ code: 400, message: '用户名或密码错误' });
    }

    // 账号级连续失败锁定（防分布式 IP 暴力破解）
    if (await isAccountLocked(admin.id)) {
      return res.json({ code: 429, message: '尝试次数过多，请 15 分钟后再试' });
    }

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      await recordLoginFailure(admin.id);
      return res.json({ code: 400, message: '用户名或密码错误' });
    }
    await clearLoginFailures(admin.id);

    // 获取角色
    const roles = await query(
      `SELECT r.name FROM roles r
       JOIN admin_role_relations arr ON r.id = arr.role_id
       WHERE arr.admin_id = ?`,
      [admin.id]
    );

    const token = jwt.sign(
      { id: admin.id, type: 'admin', roles: roles.map(r => r.name) },
      ADMIN_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      code: 0,
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          name: admin.name,
          roles: roles.map(r => r.name),
        },
      },
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ code: 500, message: '登录失败' });
  }
});

/**
 * @swagger
 * /api/v1/admin/auth/me:
 *   get:
 *     tags: [后台-认证]
 *     summary: 获取当前管理员信息
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/me', async (req, res) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    
    if (!token) {
      return res.status(401).json({ code: 401, message: '未登录' });
    }

    const payload = jwt.verify(token, ADMIN_SECRET);
    if (payload.type !== 'admin') {
      return res.status(401).json({ code: 401, message: '权限不足' });
    }

    const admin = await queryOne('SELECT * FROM admin_users WHERE id = ?', [payload.id]);
    if (!admin) {
      return res.status(401).json({ code: 401, message: '管理员不存在' });
    }

    const roles = await query(
      `SELECT r.name FROM roles r
       JOIN admin_role_relations arr ON r.id = arr.role_id
       WHERE arr.admin_id = ?`,
      [admin.id]
    );

    res.json({
      code: 0,
      data: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        roles: roles.map(r => r.name),
      },
    });
  } catch (err) {
    console.error('Get admin me error:', err);
    res.status(401).json({ code: 401, message: '登录已过期' });
  }
});

export default router;
