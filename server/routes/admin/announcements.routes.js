import { Router } from 'express';
import { query, queryOne, insert, update, del } from '../../db.js';
import { audit } from '../../services/audit-log.service.js';

const router = Router();

/**
 * @swagger
 * /api/v1/admin/announcements:
 *   get:
 *     tags: [后台-公告]
 *     summary: 公告列表（含已下线）
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    const list = await query(
      'SELECT * FROM announcements ORDER BY is_top DESC, sort_order ASC, created_at DESC LIMIT ? OFFSET ?',
      [Number(pageSize), offset]
    );
    const [countResult] = await query('SELECT COUNT(*) as total FROM announcements');

    res.json({
      code: 0,
      data: { list, total: countResult.total, page: Number(page), pageSize: Number(pageSize) },
    });
  } catch (err) {
    console.error('Admin get announcements error:', err);
    res.status(500).json({ code: 500, message: '获取公告列表失败' });
  }
});

/**
 * @swagger
 * /api/v1/admin/announcements/{id}:
 *   get:
 *     tags: [后台-公告]
 *     summary: 公告详情
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
    const item = await queryOne('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
    if (!item) return res.json({ code: 404, message: '公告不存在' });
    res.json({ code: 0, data: item });
  } catch (err) {
    console.error('Admin get announcement error:', err);
    res.status(500).json({ code: 500, message: '获取公告失败' });
  }
});

/**
 * @swagger
 * /api/v1/admin/announcements:
 *   post:
 *     tags: [后台-公告]
 *     summary: 创建公告
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *               mediaType: { type: string, enum: [text, image, video, mixed] }
 *               mediaUrl: { type: string }
 *               linkUrl: { type: string }
 *               isTop: { type: integer }
 *               sortOrder: { type: integer }
 *               status: { type: string, enum: [active, inactive] }
 *               startAt: { type: string, format: date-time }
 *               endAt: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: 创建成功
 */
router.post('/', audit('announcement', 'create', (req, res, body) => body?.data?.id ?? null), async (req, res) => {
  try {
    const { title, content, mediaType, mediaUrl, linkUrl, isTop, sortOrder, startAt, endAt } = req.body || {};
    if (!title || !title.trim()) {
      return res.json({ code: 400, message: '标题不能为空' });
    }
    if (!content && !mediaUrl) {
      return res.json({ code: 400, message: '正文和附件不能同时为空' });
    }
    const result = await insert('announcements', {
      title: title.trim(),
      content: content || null,
      media_type: mediaType || (mediaUrl ? (content ? 'mixed' : 'image') : 'text'),
      media_url: mediaUrl || null,
      link_url: linkUrl || null,
      is_top: isTop ? 1 : 0,
      sort_order: sortOrder ?? 0,
      status: 'active',
      start_at: startAt || null,
      end_at: endAt || null,
    });
    res.json({ code: 0, data: { id: result.id } });
  } catch (err) {
    console.error('Admin create announcement error:', err);
    res.status(500).json({ code: 500, message: '创建公告失败' });
  }
});

/**
 * @swagger
 * /api/v1/admin/announcements/{id}:
 *   put:
 *     tags: [后台-公告]
 *     summary: 更新公告
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
router.put('/:id', audit('announcement', 'edit'), async (req, res) => {
  try {
    const { title, content, mediaType, mediaUrl, linkUrl, isTop, sortOrder, status, startAt, endAt } = req.body || {};
    const data = {};
    if (title !== undefined) {
      if (!title.trim()) return res.json({ code: 400, message: '标题不能为空' });
      data.title = title.trim();
    }
    if (content !== undefined) data.content = content;
    if (mediaType !== undefined) data.media_type = mediaType;
    if (mediaUrl !== undefined) data.media_url = mediaUrl;
    if (linkUrl !== undefined) data.link_url = linkUrl;
    if (isTop !== undefined) data.is_top = isTop ? 1 : 0;
    if (sortOrder !== undefined) data.sort_order = sortOrder;
    if (status !== undefined) data.status = status;
    if (startAt !== undefined) data.start_at = startAt || null;
    if (endAt !== undefined) data.end_at = endAt || null;

    if (Object.keys(data).length === 0) {
      return res.json({ code: 400, message: '无更新字段' });
    }

    await update('announcements', data, 'id = ?', [req.params.id]);
    res.json({ code: 0, message: '更新成功' });
  } catch (err) {
    console.error('Admin update announcement error:', err);
    res.status(500).json({ code: 500, message: '更新公告失败' });
  }
});

/**
 * @swagger
 * /api/v1/admin/announcements/{id}:
 *   delete:
 *     tags: [后台-公告]
 *     summary: 删除公告
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
router.delete('/:id', audit('announcement', 'delete'), async (req, res) => {
  try {
    await del('announcements', 'id = ?', [req.params.id]);
    res.json({ code: 0, message: '删除成功' });
  } catch (err) {
    console.error('Admin delete announcement error:', err);
    res.status(500).json({ code: 500, message: '删除公告失败' });
  }
});

export default router;
