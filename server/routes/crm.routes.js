import { Router } from 'express';
import { query, queryOne, insert, update } from '../db.js';
import { authRequired } from '../auth.js';

const router = Router();

// 获取我的CRM商机库
router.get('/', authRequired, async (req, res) => {
  try {
    const { status, keyword, page = 1, pageSize = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let sql = `SELECT crm.*, o.title, o.city, o.hotel_name, o.price, 
               c.name as category_name, c.icon as category_icon,
               (SELECT MAX(fu.next_follow_date) FROM follow_ups fu WHERE fu.crm_opportunity_id = crm.id) as next_follow_date,
               (SELECT COUNT(*) FROM follow_ups fu WHERE fu.crm_opportunity_id = crm.id) as follow_up_count
               FROM crm_opportunities crm
               LEFT JOIN opportunities o ON crm.opportunity_id = o.id
               LEFT JOIN opportunity_categories c ON o.category_id = c.id
               WHERE crm.user_id = ?`;
    const params = [req.userId];

    if (status) {
      sql += ' AND crm.status = ?';
      params.push(status);
    }
    if (keyword) {
      sql += ' AND (o.title LIKE ? OR o.hotel_name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY crm.updated_at DESC LIMIT ? OFFSET ?';
    params.push(Number(pageSize), offset);

    const list = await query(sql, params);

    const [countResult] = await query(
      'SELECT COUNT(*) as total FROM crm_opportunities WHERE user_id = ?',
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
    console.error('Get CRM list error:', err);
    res.status(500).json({ code: 500, message: '获取CRM列表失败' });
  }
});

// 获取CRM商机详情
router.get('/:id', authRequired, async (req, res) => {
  try {
    const crm = await queryOne(
      `SELECT crm.*, o.title, o.description_full, 
              o.city, o.address, o.hotel_name, o.price, o.contact_name, o.contact_phone,
              o.wechat, o.stage, o.attachments, o.brand,
              c.name as category_name
       FROM crm_opportunities crm
       LEFT JOIN opportunities o ON crm.opportunity_id = o.id
       LEFT JOIN opportunity_categories c ON o.category_id = c.id
       WHERE crm.id = ? AND crm.user_id = ?`,
      [req.params.id, req.userId]
    );

    if (!crm) {
      return res.json({ code: 404, message: 'CRM商机不存在' });
    }

    // 获取跟进记录
    const followUps = await query(
      'SELECT * FROM follow_ups WHERE crm_opportunity_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );

    // 获取市场情报（同行进展；投稿人全匿名，不返回昵称）
    let marketIntelligence = null;
    if (crm.opportunity_id) {
      const shares = await query(
        `SELECT s.id, s.status, s.summary, s.helpful_count, s.report_count, s.created_at, s.user_id
         FROM follow_up_shares s
         WHERE s.opportunity_id = ? AND s.audit_status = 'approved'
         ORDER BY s.helpful_count DESC, s.created_at DESC`,
        [crm.opportunity_id]
      );
      const statusCounts = {};
      shares.forEach((s) => {
        statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
      });

      // 当前用户点赞过的进展同步
      let myLikedShares = new Set();
      const likes = await query(
        `SELECT m.share_id FROM follow_up_helpful_marks m
         JOIN follow_up_shares s ON m.share_id = s.id
         WHERE m.user_id = ? AND s.opportunity_id = ?`,
        [req.userId, crm.opportunity_id]
      );
      myLikedShares = new Set(likes.map((l) => l.share_id));

      // 当前用户举报过的进展同步
      let myReportedShares = new Set();
      const reports = await query(
        `SELECT m.share_id FROM follow_up_share_invalid_marks m
         JOIN follow_up_shares s ON m.share_id = s.id
         WHERE m.user_id = ? AND s.opportunity_id = ?`,
        [req.userId, crm.opportunity_id]
      );
      myReportedShares = new Set(reports.map((r) => r.share_id));

      marketIntelligence = {
        totalShares: shares.length,
        statusDistribution: statusCounts,
        shareBoard: shares.slice(0, 100).map((s) => ({
          shareId: s.id,
          status: s.status,
          summary: s.summary,
          helpfulCount: s.helpful_count,
          createdAt: s.created_at,
          isOwn: req.userId === s.user_id,
          isLiked: myLikedShares.has(s.id),
          reportCount: s.report_count || 0,
          isReported: myReportedShares.has(s.id),
        })),
      };
    }

    // 解析附件
    let attachments = [];
    if (crm.attachments) {
      try {
        attachments = JSON.parse(crm.attachments);
      } catch {
        attachments = [];
      }
    }

    res.json({
      code: 0,
      data: {
        ...crm,
        attachments,
        marketIntelligence,
        followUps,
      },
    });
  } catch (err) {
    console.error('Get CRM detail error:', err);
    res.status(500).json({ code: 500, message: '获取CRM详情失败' });
  }
});

// 手动录入商机到CRM
router.post('/', authRequired, async (req, res) => {
  try {
    const { title, categoryName, city, hotelName, description, contactName, contactPhone } = req.body || {};

    if (!title) {
      return res.json({ code: 400, message: '请填写商机标题' });
    }

    // 先创建一个商机记录
    const opportunity = await insert('opportunities', {
      user_id: req.userId,
      title,
      category_id: 1, // 默认分类
      description_full: description || '',
      contact_name: contactName || '',
      contact_phone: contactPhone || '',
      city: city || '',
      hotel_name: hotelName || '',
      price: 0,
      status: 'inactive',
    });

    // 入库CRM
    const crm = await insert('crm_opportunities', {
      user_id: req.userId,
      opportunity_id: opportunity.id,
      source: 'manual',
      status: 'pending',
    });

    res.json({
      code: 0,
      data: { id: crm.id, opportunityId: opportunity.id },
      message: '录入成功',
    });
  } catch (err) {
    console.error('Add to CRM error:', err);
    res.status(500).json({ code: 500, message: '录入失败' });
  }
});

// 从CRM投稿
router.post('/:id/publish', authRequired, async (req, res) => {
  try {
    const crm = await queryOne(
      'SELECT * FROM crm_opportunities WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!crm) {
      return res.json({ code: 404, message: 'CRM商机不存在' });
    }

    if (crm.source === 'purchased') {
      return res.json({ code: 400, message: '购买的商机不能投稿' });
    }

    const { price, descriptionFull } = req.body || {};
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 10) {
      return res.json({ code: 400, message: '价格最低 10 积分' });
    }

    // 更新商机信息并公开（设置价格后出现在商机大厅）
    await update('opportunities', {
      price: priceNum,
      description_full: descriptionFull || '',
      status: 'active',
    }, 'id = ?', [crm.opportunity_id]);

    // 更新CRM状态
    await update('crm_opportunities', { status: 'following' }, 'id = ?', [crm.id]);

    res.json({
      code: 0,
      message: '投稿成功',
    });
  } catch (err) {
    console.error('Publish from CRM error:', err);
    res.status(500).json({ code: 500, message: '投稿失败' });
  }
});

export default router;
