import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne, insert, update } from '../../db.js';
import { audit } from '../../services/audit-log.service.js';

const router = Router();

/**
 * @swagger
 * /api/v1/admin/admins:
 *   get:
 *     tags: [后台-管理员]
 *     summary: 管理员列表
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: 成功 }
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, status } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    const where = [];
    const params = [];
    if (keyword) {
      where.push('(username LIKE ? OR name LIKE ? OR phone LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const list = await query(
      `SELECT id, username, name, phone, status, created_at FROM admin_users ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    );
    const [countResult] = await query(`SELECT COUNT(*) as total FROM admin_users ${whereSql}`, params);
    res.json({ code: 0, data: { list, total: countResult.total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) {
    console.error('Admin list error:', err);
    res.status(500).json({ code: 500, message: '获取管理员列表失败' });
  }
});

/**
 * @swagger
 * /api/v1/admin/admins:
 *   post:
 *     tags: [后台-管理员]
 *     summary: 创建管理员
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: 成功 }
 */
router.post('/', audit('admin_user', 'create'), async (req, res) => {
  try {
    const { username, password, name, phone } = req.body || {};
    if (!username || !password) {
      return res.json({ code: 400, message: '用户名和密码不能为空' });
    }
    const existing = await queryOne('SELECT id FROM admin_users WHERE username = ?', [username]);
    if (existing) {
      return res.json({ code: 400, message: '用户名已存在' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await insert('admin_users', { username, password_hash: passwordHash, name: name || '', phone: phone || '', status: 'active' });
    res.json({ code: 0, message: '创建成功' });
  } catch (err) {
    console.error('创建管理员 error:', err);
    res.status(500).json({ code: 500, message: '创建失败' });
  }
});

/**
 * @swagger
 * /api/v1/admin/admins/{id}:
 *   put:
 *     tags: [后台-管理员]
 *     summary: 更新管理员
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: 成功 }
 */
router.put('/:id', audit('admin_user', 'edit'), async (req, res) => {
  try {
    const { name, phone, status, password } = req.body || {};
    if (status !== undefined && status === 'inactive') {
      const target = await queryOne('SELECT status FROM admin_users WHERE id = ?', [req.params.id]);
      if (target && target.status === 'active') {
        const [countResult] = await query('SELECT COUNT(*) as total FROM admin_users WHERE status = "active"');
        if (countResult.total <= 1) {
          return res.json({ code: 400, message: '至少保留一个启用状态的管理员' });
        }
      }
    }
    const data = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (status !== undefined) data.status = status;
    if (password) data.password_hash = await bcrypt.hash(password, 10);
    if (Object.keys(data).length === 0) {
      return res.json({ code: 400, message: '无更新字段' });
    }
    await update('admin_users', data, 'id = ?', [req.params.id]);
    res.json({ code: 0, message: '更新成功' });
  } catch (err) {
    console.error('更新管理员 error:', err);
    res.status(500).json({ code: 500, message: '更新失败' });
  }
});

/**
 * @swagger
 * /api/v1/admin/admins/{id}:
 *   delete:
 *     tags: [后台-管理员]
 *     summary: 删除管理员
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: 成功 }
 */
router.delete('/:id', audit('admin_user', 'delete'), async (req, res) => {
  try {
    const admins = await query('SELECT COUNT(*) as total FROM admin_users WHERE status = "active"');
    if (admins[0].total <= 1) {
      return res.json({ code: 400, message: '至少保留一个管理员' });
    }
    await query('DELETE FROM admin_users WHERE id = ?', [req.params.id]);
    res.json({ code: 0, message: '删除成功' });
  } catch (err) {
    console.error('删除管理员 error:', err);
    res.status(500).json({ code: 500, message: '删除失败' });
  }
});

export default router;