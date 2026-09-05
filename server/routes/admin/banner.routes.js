import { Router } from 'express';
import { query, queryOne, insert, update, del } from '../../db.js';
import { audit } from '../../services/audit-log.service.js';
import { pickBodyFields } from '../../utils/body-fields.js';

const router = Router();

/**
 * @swagger
 * /api/v1/admin/banners:
 *   get:
 *     tags: [后台-Banner]
 *     summary: Banner列表
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, status } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    const where = [];
    const params = [];
    if (keyword) {
      where.push('title LIKE ?');
      params.push(`%${keyword}%`);
    }
    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const list = await query(
      `SELECT * FROM banners ${whereSql} ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    );
    const [countResult] = await query(`SELECT COUNT(*) as total FROM banners ${whereSql}`, params);

    res.json({
      code: 0,
      data: { list, total: countResult.total, page: Number(page), pageSize: Number(pageSize) },
    });
  } catch (err) {
    console.error('Admin get banners error:', err);
    res.status(500).json({ code: 500, message: '获取Banner列表失败' });
  }
});

/**
 * @swagger
 * /api/v1/admin/banners/{id}:
 *   get:
 *     tags: [后台-Banner]
 *     summary: Banner详情
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
router.get('/:id', async (req, res) => {
  try {
    const banner = await queryOne('SELECT * FROM banners WHERE id = ?', [req.params.id]);
    if (!banner) return res.json({ code: 404, message: 'Banner不存在' });
    res.json({ code: 0, data: banner });
  } catch (err) {
    console.error('Admin get banner error:', err);
    res.status(500).json({ code: 500, message: '获取Banner失败' });
  }
});

/**
 * @swagger
 * /api/v1/admin/banners:
 *   post:
 *     tags: [后台-Banner]
 *     summary: 创建Banner
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功
 */
router.post('/', audit('banner', 'create'), async (req, res) => {
  try {
    const { title, imageUrl, linkUrl, sortOrder, startAt, endAt } = pickBodyFields(req.body, [
      'title', 'imageUrl', 'linkUrl', 'sortOrder', 'startAt', 'endAt',
    ]);
    if (!title || !imageUrl) {
      return res.json({ code: 400, message: '标题和图片不能为空' });
    }
    const result = await insert('banners', {
      title,
      image_url: imageUrl,
      link_url: linkUrl || '',
      sort_order: sortOrder ?? 0,
      start_at: startAt || null,
      end_at: endAt || null,
      status: 'active',
    });
    res.json({ code: 0, data: { id: result.insertId } });
  } catch (err) {
    console.error('Admin create banner error:', err);
    res.status(500).json({ code: 500, message: '创建Banner失败' });
  }
});

/**
 * @swagger
 * /api/v1/admin/banners/{id}:
 *   put:
 *     tags: [后台-Banner]
 *     summary: 更新Banner
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
router.put('/:id', audit('banner', 'edit'), async (req, res) => {
  try {
    const { title, imageUrl, linkUrl, sortOrder, status, startAt, endAt } = pickBodyFields(req.body, [
      'title', 'imageUrl', 'linkUrl', 'sortOrder', 'status', 'startAt', 'endAt',
    ]);
    const data = {};
    if (title !== undefined) data.title = title;
    if (imageUrl !== undefined) data.image_url = imageUrl;
    if (linkUrl !== undefined) data.link_url = linkUrl;
    if (sortOrder !== undefined) data.sort_order = sortOrder;
    if (status !== undefined) data.status = status;
    if (startAt !== undefined) data.start_at = startAt || null;
    if (endAt !== undefined) data.end_at = endAt || null;

    if (Object.keys(data).length === 0) {
      return res.json({ code: 400, message: '无更新字段' });
    }

    await update('banners', data, 'id = ?', [req.params.id]);
    res.json({ code: 0, message: '更新成功' });
  } catch (err) {
    console.error('Admin update banner error:', err);
    res.status(500).json({ code: 500, message: '更新Banner失败' });
  }
});

/**
 * @swagger
 * /api/v1/admin/banners/{id}:
 *   delete:
 *     tags: [后台-Banner]
 *     summary: 删除Banner
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
router.delete('/:id', audit('banner', 'delete'), async (req, res) => {
  try {
    await del('banners', 'id = ?', [req.params.id]);
    res.json({ code: 0, message: '删除成功' });
  } catch (err) {
    console.error('Admin delete banner error:', err);
    res.status(500).json({ code: 500, message: '删除Banner失败' });
  }
});

export default router;