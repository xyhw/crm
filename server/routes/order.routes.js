import { Router } from 'express';
import { query, queryOne, transaction } from '../db.js';
import { authRequired } from '../auth.js';
import { 
  getUserLevel, 
  getLevelConfig,
  getPurchasePrice,
  calculateSellerEarnings 
} from '../services/level.service.js';

const router = Router();

// 购买商机
router.post('/', authRequired, async (req, res) => {
  try {
    const { opportunityId } = req.body || {};
    
    if (!opportunityId) {
      return res.json({ code: 400, message: '请选择要购买的商机' });
    }

    // 查询商机信息
    const opportunity = await queryOne(
      'SELECT * FROM opportunities WHERE id = ? AND status = "active" AND deleted_at IS NULL',
      [opportunityId]
    );
    if (!opportunity) {
      return res.json({ code: 404, message: '商机不存在或已下架' });
    }

    // 不能购买自己的商机
    if (opportunity.user_id === req.userId) {
      return res.json({ code: 403, message: '不能购买自己发布的商机' });
    }

    // 检查是否已购买
    const existingPurchase = await queryOne(
      'SELECT id FROM orders WHERE user_id = ? AND opportunity_id = ? AND status = "paid"',
      [req.userId, opportunityId]
    );
    if (existingPurchase) {
      return res.json({ code: 409, message: '你已购买过此商机' });
    }

    // 计算购买价格（使用 level service）
    const priceInfo = await getPurchasePrice(opportunityId, req.userId);
    if (!priceInfo) {
      return res.json({ code: 404, message: '商机不存在' });
    }

    const actualPrice = priceInfo.finalPrice;
    const discountRate = priceInfo.discount;

    // 查询用户积分余额
    const accountRows = await query(
      'SELECT balance FROM points_accounts WHERE user_id = ?',
      [req.userId]
    );
    const balance = accountRows[0]?.balance || 0;

    if (balance < actualPrice) {
      return res.json({ code: 422, message: '积分余额不足' });
    }

    // 计算分佣（使用 level service）
    const earningsInfo = await calculateSellerEarnings(req.userId, opportunity.user_id, actualPrice);
    const platformCommission = earningsInfo.platformFee;
    const totalSellerIncome = earningsInfo.sellerEarnings;

    await transaction(async (conn) => {
      // 1. 扣减购买者积分
      await conn.execute(
        'UPDATE points_accounts SET balance = balance - ?, total_consumed = total_consumed + ? WHERE user_id = ? AND balance >= ?',
        [actualPrice, actualPrice, req.userId, actualPrice]
      );
      
      const [buyerAccount] = await conn.execute(
        'SELECT balance FROM points_accounts WHERE user_id = ?',
        [req.userId]
      );
      
      await conn.execute(
        `INSERT INTO points_logs (user_id, delta, balance_after, source_type, source_id, source_title)
         VALUES (?, ?, ?, 'consume', ?, ?)`,
        [req.userId, -actualPrice, buyerAccount[0].balance, opportunityId, `购买商机「${opportunity.title}」`]
      );

      // 2. 给投稿人加积分
      await conn.execute(
        'UPDATE points_accounts SET balance = balance + ? WHERE user_id = ?',
        [totalSellerIncome, opportunity.user_id]
      );
      
      const [sellerAccount] = await conn.execute(
        'SELECT balance FROM points_accounts WHERE user_id = ?',
        [opportunity.user_id]
      );
      
      await conn.execute(
        `INSERT INTO points_logs (user_id, delta, balance_after, source_type, source_id, source_title)
         VALUES (?, ?, ?, 'commission', ?, ?)`,
        [opportunity.user_id, totalSellerIncome, sellerAccount[0].balance, opportunityId, `商机被购买「${opportunity.title}」`]
      );

      // 3. 创建订单
      await conn.execute(
        `INSERT INTO orders (user_id, opportunity_id, original_price, discount_rate, actual_price, platform_commission, seller_income, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'paid')`,
        [req.userId, opportunityId, opportunity.price, discountRate, actualPrice, platformCommission, totalSellerIncome]
      );

      // 4. 创建分佣记录
      await conn.execute(
        `INSERT INTO commission_settlements (order_id, seller_id, order_amount, platform_rate, platform_commission, seller_income, level_bonus, status)
         VALUES (LAST_INSERT_ID(), ?, ?, ?, ?, ?, ?, 'paid')`,
        [opportunity.user_id, actualPrice, 0.20, platformCommission, totalSellerIncome, Math.max(0, totalSellerIncome - Math.round(earningsInfo.netAmount * 0.40))]
      );

      // 5. 更新商机购买数
      await conn.execute(
        'UPDATE opportunities SET purchase_count = purchase_count + 1 WHERE id = ?',
        [opportunityId]
      );

      // 6. 入库 CRM
      await conn.execute(
        `INSERT INTO crm_opportunities (user_id, opportunity_id, source, status)
         VALUES (?, ?, 'purchased', 'pending')
         ON DUPLICATE KEY UPDATE status = status`,
        [req.userId, opportunityId]
      );

      // 7. 更新信用分
      await conn.execute(
        'UPDATE users SET credit_score = LEAST(100, credit_score + 2) WHERE id = ?',
        [opportunity.user_id]
      );
    });

    res.json({
      code: 0,
      data: {
        actualPrice,
        discountRate,
        sellerIncome: totalSellerIncome,
      },
      message: '购买成功',
    });
  } catch (err) {
    console.error('Purchase error:', err);
    res.status(500).json({ code: 500, message: '购买失败' });
  }
});

// 我的购买记录
router.get('/my', authRequired, async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    const rawList = await query(
      `SELECT o.*, opp.title, opp.city, opp.hotel_name, opp.price, opp.status as opp_status, opp.purchase_count, c.name as category_name
       FROM orders o
       JOIN opportunities opp ON o.opportunity_id = opp.id
       LEFT JOIN opportunity_categories c ON opp.category_id = c.id
       WHERE o.user_id = ? AND o.status = 'paid'
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.userId, Number(pageSize), offset]
    );

    const list = rawList.map(item => ({
      id: item.opportunity_id,
      orderId: item.id,
      title: item.title,
      categoryName: item.category_name,
      city: item.city,
      hotelName: item.hotel_name,
      price: item.price,
      status: item.opp_status,
      purchaseCount: item.purchase_count,
      isPurchased: true,
      isPublisher: false,
      createdAt: item.created_at,
    }));

    const [countResult] = await query(
      'SELECT COUNT(*) as total FROM orders WHERE user_id = ? AND status = "paid"',
      [req.userId]
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
    console.error('Get my orders error:', err);
    res.status(500).json({ code: 500, message: '获取购买记录失败' });
  }
});

export default router;