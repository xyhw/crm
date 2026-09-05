import { Router } from 'express';
import { query, queryOne, insert, update } from '../../db.js';
import { audit } from '../../services/audit-log.service.js';
import { pickBodyFields } from '../../utils/body-fields.js';

const router = Router();

/**
 * @swagger
 * /api/v1/admin/tags:
 *   get:
 *     tags: [后台-标签]
 *     summary: 标签列表
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: 成功 }
 */
router.get('/', async (req, res) => {
  try {
    const { keyword, page = 1, pageSize = 50 } = req.query;
    const where = [];
    const params = [];
    if (keyword) {
      where.push('name LIKE ?');
      params.push(`%${keyword}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const list = await query(`SELECT * FROM opportunity_tags ${whereSql} ORDER BY sort_order, id LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), (Number(page) - 1) * Number(pageSize)]);
    const [countResult] = await query(`SELECT COUNT(*) as total FROM opportunity_tags ${whereSql}`, params);
    res.json({ code: 0, data: { list, total: countResult.total } });
  } catch (err) {
    res.status(500).json({ code: 500, message: '获取标签失败' });
  }
});

/**
 * @swagger
 * /api/v1/admin/tags:
 *   post:
 *     tags: [后台-标签]
 *     summary: 创建标签
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: 成功 }
 */
router.post('/', audit('tag', 'create', (req, res, body) => body?.data?.id ?? null), async (req, res) => {
  try {
    const { name, sortOrder } = pickBodyFields(req.body, ['name', 'sortOrder']);
    if (!name) return res.json({ code: 400, message: '标签名称不能为空' });
    const result = await insert('opportunity_tags', { name, sort_order: sortOrder ?? 0 });
    res.json({ code: 0, data: { id: result.insertId } });
  } catch (err) {
    res.status(500).json({ code: 500, message: '创建标签失败' });
  }
});

/**
 * @swagger
 * /api/v1/admin/tags/{id}:
 *   put:
 *     tags: [后台-标签]
 *     summary: 更新标签
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
router.put('/:id', audit('tag', 'edit'), async (req, res) => {
  try {
    const { name, sortOrder } = pickBodyFields(req.body, ['name', 'sortOrder']);
    const data = {};
    if (name !== undefined) data.name = name;
    if (sortOrder !== undefined) data.sort_order = sortOrder;
    if (Object.keys(data).length === 0) return res.json({ code: 400, message: '无更新字段' });
    await update('opportunity_tags', data, 'id = ?', [req.params.id]);
    res.json({ code: 0, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: '更新失败' });
  }
});

/**
 * @swagger
 * /api/v1/admin/tags/{id}:
 *   delete:
 *     tags: [后台-标签]
 *     summary: 删除标签
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
router.delete('/:id', audit('tag', 'delete'), async (req, res) => {
  try {
    await query('DELETE FROM opportunity_tags WHERE id = ?', [req.params.id]);
    res.json({ code: 0, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: '删除失败' });
  }
});

export default router;