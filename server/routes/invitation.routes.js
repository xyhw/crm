import { Router } from 'express';
import { query, queryOne, insert } from '../db.js';
import { authRequired } from '../auth.js';

const router = Router();

// 获取我的邀请信息
router.get('/me', authRequired, async (req, res) => {
  try {
    const user = await queryOne('SELECT invite_code FROM users WHERE id = ?', [req.userId]);
    
    const records = await query(
      `SELECT i.*, u.nickname as invitee_nickname
       FROM invitations i
       LEFT JOIN users u ON i.invitee_id = u.id
       WHERE i.inviter_id = ?
       ORDER BY i.created_at DESC`,
      [req.userId]
    );

    const stats = await queryOne(
      'SELECT COUNT(*) as total, SUM(inviter_reward) as totalReward FROM invitations WHERE inviter_id = ? AND status = "completed"',
      [req.userId]
    );

    res.json({
      code: 0,
      data: {
        inviteCode: user?.invite_code,
        records,
        stats: {
          totalInvited: stats.total || 0,
          totalReward: stats.totalReward || 0,
        },
      },
    });
  } catch (err) {
    console.error('Get invitation info error:', err);
    res.status(500).json({ code: 500, message: '获取邀请信息失败' });
  }
});

export default router;
