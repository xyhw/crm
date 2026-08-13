import { Router } from 'express';
import { query, queryOne } from '../db.js';

const router = Router();

/**
 * @swagger
 * /api/announcements:
 *   get:
 *     tags: [Announcement]
 *     summary: 获取公告列表（用户端）
 *     description: 返回已发布且在有效期内的公告，置顶优先
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 0
 *                 data:
 *                   type: object
 *                   properties:
 *                     list:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const list = await query(
      `SELECT id, title, content, media_type, media_url, link_url, is_top, sort_order, created_at
       FROM announcements
       WHERE status = 'active'
         AND (start_at IS NULL OR start_at <= ?)
         AND (end_at IS NULL OR end_at >= ?)
       ORDER BY is_top DESC, sort_order ASC, created_at DESC
       LIMIT 50`,
      [now, now]
    );
    res.json({ code: 0, data: { list } });
  } catch (err) {
    console.error('Get announcements error:', err);
    res.status(500).json({ code: 500, message: '获取公告列表失败' });
  }
});

/**
 * @swagger
 * /api/announcements/{id}:
 *   get:
 *     tags: [Announcement]
 *     summary: 获取公告详情（用户端）
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/:id', async (req, res) => {
  try {
    const now = new Date();
    const item = await queryOne(
      `SELECT id, title, content, media_type, media_url, link_url, is_top, sort_order, created_at
       FROM announcements
       WHERE id = ? AND status = 'active'
         AND (start_at IS NULL OR start_at <= ?)
         AND (end_at IS NULL OR end_at >= ?)`,
      [req.params.id, now, now]
    );
    if (!item) return res.json({ code: 404, message: '公告不存在' });
    res.json({ code: 0, data: item });
  } catch (err) {
    console.error('Get announcement error:', err);
    res.status(500).json({ code: 500, message: '获取公告详情失败' });
  }
});

export default router;
