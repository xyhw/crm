import { Router } from 'express';
import { query, queryOne, update } from '../db.js';
import { authRequired } from '../auth.js';

const router = Router();

// 获取通知列表
router.get('/', authRequired, async (req, res) => {
  try {
    const { type, page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let sql = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [req.userId];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(pageSize), offset);

    const list = await query(sql, params);

    const [countResult] = await query(
      'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?',
      [req.userId]
    );

    const [unreadResult] = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.userId]
    );

    res.json({
      code: 0,
      data: {
        list,
        total: countResult.total,
        unreadCount: unreadResult.count,
        page: Number(page),
        pageSize: Number(pageSize),
      },
    });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ code: 500, message: '获取通知列表失败' });
  }
});

// 标记已读
router.put('/:id/read', authRequired, async (req, res) => {
  try {
    await update('notifications', { is_read: 1 }, 'id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ code: 0, message: '已标记已读' });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ code: 500, message: '标记失败' });
  }
});

// 全部标记已读
router.put('/read-all', authRequired, async (req, res) => {
  try {
    await update('notifications', { is_read: 1 }, 'user_id = ? AND is_read = 0', [req.userId]);
    res.json({ code: 0, message: '已全部标记已读' });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ code: 500, message: '标记失败' });
  }
});

export default router;
