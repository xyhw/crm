import { Router } from 'express';
import { query, insert, queryOne } from '../../db.js';

const router = Router();

// 发送通知
router.post('/send', async (req, res) => {
  try {
    const { title, content, userIds, sendAll } = req.body || {};
    if (!title || !content) {
      return res.json({ code: 400, message: '标题和内容不能为空' });
    }

    let targetUserIds = [];

    if (sendAll) {
      const users = await query('SELECT id FROM users WHERE status = "active"');
      targetUserIds = users.map((u) => u.id);
    } else if (userIds && userIds.length > 0) {
      targetUserIds = userIds;
    } else {
      return res.json({ code: 400, message: '请选择发送对象' });
    }

    if (targetUserIds.length === 0) {
      return res.json({ code: 400, message: '无符合条件的用户' });
    }

    const now = new Date();
    for (const userId of targetUserIds) {
      await insert('notifications', {
        user_id: userId,
        type: 'system',
        title,
        content,
        related_type: 'admin',
        related_id: 0,
        is_read: 0,
        created_at: now,
      });
    }

    res.json({ code: 0, message: `已向 ${targetUserIds.length} 位用户发送通知` });
  } catch (err) {
    console.error('Admin send notification error:', err);
    res.status(500).json({ code: 500, message: '发送通知失败' });
  }
});

// 获取通知历史
router.get('/history', async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    const list = await query(
      `SELECT DISTINCT title, content, related_type, 
              MIN(created_at) as sent_time,
              COUNT(*) as recipient_count
       FROM notifications
       WHERE related_type = 'admin'
       GROUP BY title, content
       ORDER BY sent_time DESC
       LIMIT ? OFFSET ?`,
      [Number(pageSize), offset]
    );

    const [countResult] = await query(
      `SELECT COUNT(*) as total FROM (
        SELECT 1 FROM notifications WHERE related_type = 'admin' GROUP BY title, content
      ) t`
    );

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
    console.error('Admin get notification history error:', err);
    res.status(500).json({ code: 500, message: '获取通知历史失败' });
  }
});

export default router;