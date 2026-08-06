import { Router } from 'express';
import { query } from '../../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const [today] = await query(
      `SELECT
        COUNT(*) as totalOrders,
        COALESCE(SUM(actual_price), 0) as totalAmount,
        COALESCE(SUM(platform_commission), 0) as totalPlatform,
        COALESCE(SUM(seller_income), 0) as totalSeller
       FROM orders WHERE status = 'paid' AND DATE(created_at) = CURDATE()`
    );

    const [total] = await query(
      `SELECT
        COUNT(*) as totalOrders,
        COALESCE(SUM(actual_price), 0) as totalAmount,
        COALESCE(SUM(platform_commission), 0) as totalPlatform,
        COALESCE(SUM(seller_income), 0) as totalSeller
       FROM orders WHERE status = 'paid'`
    );

    const [points] = await query(
      `SELECT
        COALESCE(SUM(balance), 0) as totalBalance,
        COALESCE(SUM(total_recharged), 0) as totalRecharged,
        COALESCE(SUM(total_consumed), 0) as totalConsumed,
        COALESCE(SUM(total_expired), 0) as totalExpired
       FROM points_accounts`
    );

    const [users] = await query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN credit_score >= 80 THEN 1 ELSE 0 END) as goodCredit,
        SUM(CASE WHEN credit_score < 40 THEN 1 ELSE 0 END) as badCredit
       FROM users WHERE status != 'deleted'`
    );

    const [opportunities] = await query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(purchase_count) as totalPurchases
       FROM opportunities WHERE deleted_at IS NULL`
    );

    const trend = await query(
      `SELECT DATE(created_at) as date,
              COUNT(*) as count,
              COALESCE(SUM(actual_price), 0) as amount
       FROM orders WHERE status = 'paid' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at) ORDER BY date`
    );

    res.json({
      code: 0,
      data: {
        today: { orders: totalOrders || 0, amount: totalAmount || 0, platform: totalPlatform || 0 },
        total: { orders: totalOrders || 0, amount: totalAmount || 0, platform: totalPlatform || 0, seller: totalSeller || 0 },
        points: { balance: points?.totalBalance || 0, recharged: points?.totalRecharged || 0, consumed: points?.totalConsumed || 0, expired: points?.totalExpired || 0 },
        users: { total: users?.total || 0, active: users?.active || 0, goodCredit: users?.goodCredit || 0, badCredit: users?.badCredit || 0 },
        opportunities: { total: opportunities?.total || 0, active: opportunities?.active || 0, totalPurchases: opportunities?.totalPurchases || 0 },
        trend,
      },
    });
  } catch (err) {
    console.error('Finance stats error:', err);
    res.status(500).json({ code: 500, message: '获取财务数据失败' });
  }
});

export default router;