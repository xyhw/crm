import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

/**
 * @swagger
 * /api/banners:
 *   get:
 *     tags: [Banner]
 *     summary: 获取Banner列表（用户端）
 *     description: 返回当前有效的Banner列表，按排序展示
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
 *                         properties:
 *                           id:
 *                             type: integer
 *                           title:
 *                             type: string
 *                           image_url:
 *                             type: string
 *                           link_url:
 *                             type: string
 *                           sort_order:
 *                             type: integer
 *                           status:
 *                             type: string
 *                             enum: [active, inactive]
 */
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const list = await query(
      `SELECT id, title, image_url, link_url, sort_order, status
       FROM banners
       WHERE status = 'active'
         AND (start_at IS NULL OR start_at <= ?)
         AND (end_at IS NULL OR end_at >= ?)
       ORDER BY sort_order ASC, created_at DESC`,
      [now, now]
    );
    res.json({ code: 0, data: { list } });
  } catch (err) {
    console.error('Get banners error:', err);
    res.status(500).json({ code: 500, message: '获取Banner列表失败' });
  }
});

export default router;