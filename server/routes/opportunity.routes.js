import { Router } from 'express';
import { query, queryOne, insert, update, transaction } from '../db.js';
import { authRequired, optionalAuth } from '../auth.js';
import { getMarkWeight } from '../services/level.service.js';
import { detectSimilar } from '../services/similarity.service.js';

const router = Router();

// 商机列表（支持筛选、搜索、分页）
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, keyword, status = 'active', page = 1, pageSize = 10, sort = 'newest', mine } = req.query;
    
    let sql = `SELECT o.*, c.name as category_name, c.icon as category_icon, u.nickname as publisher_name,
              (SELECT COUNT(*) FROM follow_up_shares WHERE opportunity_id = o.id AND audit_status = 'approved') as total_shares,
              (SELECT MAX(created_at) FROM follow_up_shares WHERE opportunity_id = o.id AND audit_status = 'approved') as latest_share_at
              FROM opportunities o
              LEFT JOIN opportunity_categories c ON o.category_id = c.id
              LEFT JOIN users u ON o.user_id = u.id
              WHERE 1=1`;
    const params = [];

    if (mine === '1' && req.userId) {
      sql += ' AND o.user_id = ?';
      params.push(req.userId);
    } else if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }
    if (category) {
      sql += ' AND o.category_id = ?';
      params.push(category);
    }
    if (keyword) {
      sql += ' AND (o.title LIKE ? OR o.hotel_name LIKE ? OR o.city LIKE ? OR o.brand LIKE ? OR o.address LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw, kw, kw);
    }

    // 排序
    if (sort === 'newest') {
      sql += ' ORDER BY o.created_at DESC';
    } else if (sort === 'popular') {
      sql += ' ORDER BY o.purchase_count DESC, o.created_at DESC';
    } else if (sort === 'price_asc') {
      sql += ' ORDER BY o.price ASC';
    } else if (sort === 'price_desc') {
      sql += ' ORDER BY o.price DESC';
    } else {
      sql += ' ORDER BY o.created_at DESC';
    }

    // 分页
    const offset = (Number(page) - 1) * Number(pageSize);
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(pageSize), offset);

    const list = await query(sql, params);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM opportunities o WHERE 1=1';
    const countParams = [];
    if (mine === '1' && req.userId) {
      countSql += ' AND o.user_id = ?';
      countParams.push(req.userId);
    } else if (status) {
      countSql += ' AND o.status = ?';
      countParams.push(status);
    }
    if (category) {
      countSql += ' AND o.category_id = ?';
      countParams.push(category);
    }
    if (keyword) {
      countSql += ' AND (o.title LIKE ? OR o.hotel_name LIKE ? OR o.city LIKE ? OR o.brand LIKE ? OR o.address LIKE ?)';
      const kw = `%${keyword}%`;
      countParams.push(kw, kw, kw, kw, kw);
    }
    const [countResult] = await query(countSql, countParams);

    // 如果用户已登录，检查购买态
    let purchasedIds = [];
    if (req.userId) {
      const purchases = await query(
        'SELECT opportunity_id FROM orders WHERE user_id = ? AND status = "paid"',
        [req.userId]
      );
      purchasedIds = purchases.map(p => p.opportunity_id);
    }

    // 字段分层：未购买的不返回联系方式等
    const enrichedList = list.map(item => {
      const isPurchased = purchasedIds.includes(item.id);
      const isPublisher = req.userId === item.user_id;
      
      return {
        id: item.id,
        title: item.title,
        categoryName: item.category_name,
        categoryIcon: item.category_icon,
        city: item.city,
        brand: item.brand || item.hotel_name,
        hotelName: item.hotel_name,
        price: item.price,
        status: item.status,
        purchaseCount: item.purchase_count,
        viewCount: item.view_count,
        publisherName: item.publisher_name,
        createdAt: item.created_at,
        totalShares: item.total_shares || 0,
        latestShareAt: item.latest_share_at,
        // 仅购买者或投稿人可见
        ...(isPurchased || isPublisher ? {
          address: item.address,
          stage: item.stage,
          descriptionFull: item.description_full,
          contactName: item.contact_name,
          contactPhone: item.contact_phone,
          wechat: item.wechat,
        } : {}),
        isPurchased,
        isPublisher,
      };
    });

    res.json({
      code: 0,
      data: {
        list: enrichedList,
        total: countResult.total,
        page: Number(page),
        pageSize: Number(pageSize),
      },
    });
  } catch (err) {
    console.error('Get opportunities error:', err);
    res.status(500).json({ code: 500, message: '获取商机列表失败' });
  }
});

// 商机详情
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const opportunity = await queryOne(
      `SELECT o.*, c.name as category_name, c.icon as category_icon, 
              u.nickname as publisher_name, u.company as publisher_company
       FROM opportunities o 
       LEFT JOIN opportunity_categories c ON o.category_id = c.id 
       LEFT JOIN users u ON o.user_id = u.id 
       WHERE o.id = ? AND o.deleted_at IS NULL`,
      [req.params.id]
    );

    if (!opportunity) {
      return res.json({ code: 404, message: '商机不存在' });
    }

    // 增加浏览量
    await update('opportunities', { view_count: opportunity.view_count + 1 }, 'id = ?', [opportunity.id]);
    const finalViewCount = opportunity.view_count + 1;

    // 检查购买态
    let isPurchased = false;
    let crmId = null;
    if (req.userId) {
      const purchase = await queryOne(
        'SELECT id FROM orders WHERE user_id = ? AND opportunity_id = ? AND status = "paid"',
        [req.userId, opportunity.id]
      );
      isPurchased = !!purchase;
      if (isPurchased) {
        const crm = await queryOne(
          'SELECT id FROM crm_opportunities WHERE user_id = ? AND opportunity_id = ?',
          [req.userId, opportunity.id]
        );
        crmId = crm?.id || null;
      }
    }
    const isPublisher = req.userId === opportunity.user_id;

    // 获取标签
    const tags = await query(
      `SELECT t.id, t.name FROM opportunity_tags t 
       JOIN opportunity_tag_relations r ON t.id = r.tag_id 
       WHERE r.opportunity_id = ?`,
      [opportunity.id]
    );

    // 获取市场情报（已审核的共享摘要，按点赞数排序做进度榜）
    const shares = await query(
      `SELECT s.id, s.status, s.summary, s.helpful_count, s.report_count, s.created_at, s.user_id, u.nickname
       FROM follow_up_shares s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.opportunity_id = ? AND s.audit_status = 'approved'
       ORDER BY s.helpful_count DESC, s.created_at DESC`,
      [opportunity.id]
    );

    // 统计进度分布
    const statusCounts = {};
    shares.forEach(s => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    });

    // 当前用户点赞过的共享（用于回显点赞状态，防重复点赞）
    let myLikedShares = new Set();
    if (req.userId && isPurchased) {
      const likes = await query(
        `SELECT m.share_id FROM follow_up_helpful_marks m
         JOIN follow_up_shares s ON m.share_id = s.id
         WHERE m.user_id = ? AND s.opportunity_id = ?`,
        [req.userId, opportunity.id]
      );
      myLikedShares = new Set(likes.map(l => l.share_id));
    }

    // 当前用户举报过的共享（用于回显举报状态，防重复举报）
    let myReportedShares = new Set();
    if (req.userId && isPurchased) {
      const reports = await query(
        `SELECT m.share_id FROM follow_up_share_invalid_marks m
         JOIN follow_up_shares s ON m.share_id = s.id
         WHERE m.user_id = ? AND s.opportunity_id = ?`,
        [req.userId, opportunity.id]
      );
      myReportedShares = new Set(reports.map(r => r.share_id));
    }

    const result = {
      id: opportunity.id,
      title: opportunity.title,
      categoryName: opportunity.category_name,
      categoryIcon: opportunity.category_icon,
      city: opportunity.city,
      brand: opportunity.brand || opportunity.hotel_name,
      hotelName: opportunity.hotel_name,
      price: opportunity.price,
      status: opportunity.status,
      purchaseCount: opportunity.purchase_count,
      viewCount: finalViewCount,
      invalidMarkCount: opportunity.invalid_mark_count,
      publisherName: opportunity.publisher_name,
      publisherCompany: opportunity.publisher_company,
      tags: tags.map(t => ({ id: t.id, name: t.name })),
      createdAt: opportunity.created_at,
    };

    // 仅购买者或投稿人可见（含市场情报）
    if (isPurchased || isPublisher) {
      result.address = opportunity.address;
      result.stage = opportunity.stage;
      result.descriptionPublic = opportunity.description_public;
      result.descriptionFull = opportunity.description_full;
      result.validUntil = opportunity.valid_until;
      result.contactName = opportunity.contact_name;
      result.contactPhone = opportunity.contact_phone;
      result.wechat = opportunity.wechat;
      try {
        result.attachments = opportunity.attachments ? JSON.parse(opportunity.attachments) : [];
      } catch {
        result.attachments = [];
      }
      result.marketIntelligence = {
        totalShares: shares.length,
        statusDistribution: statusCounts,
        shareBoard: shares.slice(0, 100).map(s => ({
          shareId: s.id,
          status: s.status,
          summary: s.summary,
          helpfulCount: s.helpful_count,
          createdAt: s.created_at,
          nickname: s.nickname || '匿名用户',
          isOwn: req.userId === s.user_id,
          isLiked: myLikedShares.has(s.id),
          reportCount: s.report_count || 0,
          isReported: myReportedShares.has(s.id),
        })),
      };
    } else {
      result.attachments = [];
    }

    result.isPurchased = isPurchased;
    result.isPublisher = isPublisher;
    result.crmId = crmId;

    res.json({ code: 0, data: result });
  } catch (err) {
    console.error('Get opportunity detail error:', err);
    res.status(500).json({ code: 500, message: '获取商机详情失败' });
  }
});

// 发布商机
router.post('/', authRequired, async (req, res) => {
  try {
    const { title, categoryId, descriptionFull, contactName, contactPhone, city, address, brand, wechat, stage, price, tags, attachments } = req.body || {};

    if (!title || !categoryId || !brand || !city || !contactName || !contactPhone || !price) {
      return res.json({ code: 400, message: '请完善必填信息' });
    }

    // 检查价格范围
    const [priceConfig] = await query(
      "SELECT config_value FROM system_configs WHERE config_key IN ('opportunity_price_min', 'opportunity_price_max')"
    );
    // 简化：直接使用传入的价格

    // 相似度检测
    const similar = await detectSimilar(title, city, address, categoryId);

    // 创建商机
    const opportunity = await insert('opportunities', {
      user_id: req.userId,
      title,
      category_id: categoryId,
      description_full: descriptionFull || '',
      contact_name: contactName || '',
      contact_phone: contactPhone || '',
      wechat: wechat || '',
      city: city || '',
      address: address || '',
      brand: brand || '',
      stage: stage || '',
      price: Number(price),
      status: 'active',
      attachments: Array.isArray(attachments) && attachments.length > 0 ? JSON.stringify(attachments) : null,
    });

    // 处理标签
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        let tag = await queryOne('SELECT id FROM opportunity_tags WHERE name = ?', [tagName]);
        if (!tag) {
          tag = await insert('opportunity_tags', { name: tagName });
        }
        await insert('opportunity_tag_relations', {
          opportunity_id: opportunity.id,
          tag_id: tag.id,
        });
      }
    }

    res.json({
      code: 0,
      data: {
        id: opportunity.id,
        title: opportunity.title,
        similarOpportunities: similar,
      },
      message: '发布成功',
    });
  } catch (err) {
    console.error('Create opportunity error:', err);
    res.status(500).json({ code: 500, message: '发布失败' });
  }
});

// 标记无效
router.post('/:id/invalid-mark', authRequired, async (req, res) => {
  try {
    const { reason, reasonText } = req.body || {};
    const opportunityId = req.params.id;

    if (!reason) {
      return res.json({ code: 400, message: '请选择标记原因' });
    }

    // 检查是否已购买
    const purchase = await queryOne(
      'SELECT id FROM orders WHERE user_id = ? AND opportunity_id = ? AND status = "paid"',
      [req.userId, opportunityId]
    );
    if (!purchase) {
      return res.json({ code: 400, message: '只有购买者才能标记无效' });
    }

    // 检查是否已标记
    const existing = await queryOne(
      'SELECT id FROM opportunity_invalid_marks WHERE opportunity_id = ? AND user_id = ?',
      [opportunityId, req.userId]
    );
    if (existing) {
      return res.json({ code: 409, message: '你已经标记过此商机' });
    }

    await transaction(async (conn) => {
      // 插入标记
      await conn.execute(
        'INSERT INTO opportunity_invalid_marks (opportunity_id, user_id, reason, reason_text) VALUES (?, ?, ?, ?)',
        [opportunityId, req.userId, reason, reasonText || '']
      );

      // 更新无效标记计数
      await conn.execute(
        'UPDATE opportunities SET invalid_mark_count = invalid_mark_count + 1 WHERE id = ?',
        [opportunityId]
      );

      // 检查是否达到阈值
      const [opp] = await conn.execute('SELECT purchase_count, invalid_mark_count, user_id FROM opportunities WHERE id = ?', [opportunityId]);
      const { purchase_count, invalid_mark_count, user_id: publisherId } = opp[0];

      const [thresholdConfig] = await conn.execute(
        "SELECT config_value FROM system_configs WHERE config_key = 'invalid_threshold'"
      );
      const threshold = parseFloat(thresholdConfig[0]?.config_value || '0.20');

      if (purchase_count > 0 && invalid_mark_count / purchase_count >= threshold) {
        // 触发无效判定
        await conn.execute(
          'UPDATE opportunities SET status = "invalid" WHERE id = ?',
          [opportunityId]
        );

        // 退款所有购买者
        const orders = await conn.execute(
          'SELECT id, user_id, actual_price FROM orders WHERE opportunity_id = ? AND status = "paid"',
          [opportunityId]
        );

        for (const order of orders[0]) {
          // 退款积分
          await conn.execute(
            'UPDATE points_accounts SET balance = balance + ? WHERE user_id = ?',
            [order.actual_price, order.user_id]
          );
          await conn.execute(
            `INSERT INTO points_logs (user_id, delta, balance_after, source_type, source_title)
             VALUES (?, ?, 
               (SELECT balance FROM points_accounts WHERE user_id = ?),
               'refund', '商机无效退款')`,
            [order.user_id, order.actual_price, order.user_id]
          );
          // 更新订单状态
          await conn.execute(
            'UPDATE orders SET status = "refunded", refunded_at = NOW() WHERE id = ?',
            [order.id]
          );
        }

        // 扣回投稿人分佣
        const [penaltyConfig] = await conn.execute(
          "SELECT config_value FROM system_configs WHERE config_key = 'invalid_penalty_rate'"
        );
        const penaltyRate = parseFloat(penaltyConfig[0]?.config_value || '0.50');
        
        // 扣除信用分
        await conn.execute(
          'UPDATE users SET credit_score = GREATEST(0, credit_score - 10) WHERE id = ?',
          [publisherId]
        );
        await conn.execute(
          `INSERT INTO user_credits (user_id, credit_score, change_amount, change_reason, source_type)
           SELECT ?, credit_score, -10, '商机被判无效', 'invalid_mark' FROM users WHERE id = ?`,
          [publisherId, publisherId]
        );
      }
    });

    res.json({ code: 0, message: '标记成功' });
  } catch (err) {
    console.error('Mark invalid error:', err);
    res.status(500).json({ code: 500, message: '标记失败' });
  }
});

export default router;
