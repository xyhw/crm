import { Router } from 'express';
import { adminAuthRequired } from '../../auth.js';
import { query, queryOne } from '../../db.js';

const router = Router();

router.get('/dashboard', adminAuthRequired, async (req, res) => {
  try {
    const userRows = await query('SELECT COUNT(*) as total FROM users WHERE status = "active"');
    const oppRows = await query('SELECT COUNT(*) as total FROM opportunities WHERE status = "active"');
    const orderRows = await query('SELECT COUNT(*) as total FROM orders WHERE status = "paid"');
    const pointsRows = await query('SELECT COALESCE(SUM(balance), 0) as total FROM points_accounts');
    const todayOrderRows = await query('SELECT COUNT(*) as total FROM orders WHERE status = "paid" AND DATE(created_at) = CURDATE()');
    const todayRevenueRows = await query('SELECT COALESCE(SUM(actual_price), 0) as total FROM orders WHERE status = "paid" AND DATE(created_at) = CURDATE()');

    res.json({
      code: 0,
      data: {
        totalUsers: (userRows && userRows[0]?.total) || 0,
        totalOpportunities: (oppRows && oppRows[0]?.total) || 0,
        totalOrders: (orderRows && orderRows[0]?.total) || 0,
        totalPoints: (pointsRows && pointsRows[0]?.total) || 0,
        todayOrders: (todayOrderRows && todayOrderRows[0]?.total) || 0,
        todayRevenue: (todayRevenueRows && todayRevenueRows[0]?.total) || 0,
      },
    });
  } catch (err) {
    console.error('[Stats dashboard]', err.message);
    res.status(500).json({ code: 500, message: '获取仪表盘数据失败' });
  }
});

router.get('/trends', adminAuthRequired, async (req, res) => {
  try {
    const days = 7;
    const newUsers = await query(
      'SELECT DATE(created_at) as date, COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY date ORDER BY date',
      [days]
    );
    const newOpps = await query(
      'SELECT DATE(created_at) as date, COUNT(*) as count FROM opportunities WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY date ORDER BY date',
      [days]
    );
    const revenue = await query(
      'SELECT DATE(created_at) as date, COALESCE(SUM(actual_price), 0) as amount FROM orders WHERE status = "paid" AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY date ORDER BY date',
      [days]
    );

    res.json({ code: 0, data: { users: newUsers || [], opportunities: newOpps || [], revenue: revenue || [] } });
  } catch (err) {
    console.error('[Stats trends]', err.message);
    res.status(500).json({ code: 500, message: '获取趋势数据失败' });
  }
});

router.get('/distribution', adminAuthRequired, async (req, res) => {
  try {
    const oppCategories = await query(
      `SELECT c.name, COUNT(*) as count FROM opportunities o
       JOIN opportunity_categories c ON o.category_id = c.id
       WHERE o.status = 'active' GROUP BY c.name ORDER BY count DESC`
    );
    const levelDist = await query(
      'SELECT level, COUNT(*) as count FROM user_level_stats GROUP BY level ORDER BY count DESC'
    );
    const priceDist = await query(
      `SELECT CASE WHEN price <= 50 THEN '0-50' WHEN price <= 100 THEN '51-100' WHEN price <= 150 THEN '101-150' ELSE '151+' END as price_range,
       COUNT(*) as count FROM opportunities WHERE status = 'active' GROUP BY price_range ORDER BY price_range`
    );

    res.json({ code: 0, data: { oppCategories: oppCategories || [], levelDist: levelDist || [], priceDist: priceDist || [] } });
  } catch (err) {
    console.error('[Stats distribution]', err.message);
    res.status(500).json({ code: 500, message: '获取分布数据失败' });
  }
});

export default router;