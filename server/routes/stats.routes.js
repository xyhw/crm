import { Router } from 'express';
import { query, queryOne } from '../db.js';
import { authRequired } from '../auth.js';

const router = Router();

// 获取用户个人统计
router.get('/me', authRequired, async (req, res) => {
  try {
    // 投稿统计
    const [publishStats] = await query(
      'SELECT COUNT(*) as total, SUM(CASE WHEN status = "active" THEN 1 ELSE 0 END) as active FROM opportunities WHERE user_id = ?',
      [req.userId]
    );

    // 被购买统计
    const [purchaseStats] = await query(
      `SELECT COUNT(*) as total, SUM(actual_price) as totalIncome
       FROM orders o
       JOIN opportunities opp ON o.opportunity_id = opp.id
       WHERE opp.user_id = ? AND o.status = 'paid'`,
      [req.userId]
    );

    // 购买统计
    const [boughtStats] = await query(
      'SELECT COUNT(*) as total FROM orders WHERE user_id = ? AND status = "paid"',
      [req.userId]
    );

    // CRM统计
    const [crmStats] = await query(
      'SELECT COUNT(*) as total FROM crm_opportunities WHERE user_id = ?',
      [req.userId]
    );

    // 等级信息
    const [levelStats] = await query(
      'SELECT * FROM user_level_stats WHERE user_id = ?',
      [req.userId]
    );

    res.json({
      code: 0,
      data: {
        published: publishStats.total || 0,
        publishedActive: publishStats.active || 0,
        totalPurchased: purchaseStats.total || 0,
        totalIncome: purchaseStats.totalIncome || 0,
        bought: boughtStats.total || 0,
        crm: crmStats.total || 0,
        level: levelStats[0] || { level: 'normal' },
      },
    });
  } catch (err) {
    console.error('Get my stats error:', err);
    res.status(500).json({ code: 500, message: '获取统计信息失败' });
  }
});

export default router;
