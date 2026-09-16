import { Router } from 'express';
import { query, queryOne, update } from '../../db.js';
import { recordLog } from '../../services/audit-log.service.js';

const router = Router();

// 获取商机列表
router.get('/', async (req, res) => {
  try {
    const { status, category, keyword, page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let sql = `SELECT o.*, c.name as category_name, u.nickname as publisher_name
               FROM opportunities o
               LEFT JOIN opportunity_categories c ON o.category_id = c.id
               LEFT JOIN users u ON o.user_id = u.id
               WHERE o.deleted_at IS NULL`;
    const params = [];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }
    if (category) {
      sql += ' AND o.category_id = ?';
      params.push(category);
    }
    if (keyword) {
      sql += ' AND (o.title LIKE ? OR o.hotel_name LIKE ? OR o.city LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(pageSize), offset);

    const list = await query(sql, params);

    let countSql = `SELECT COUNT(*) as total FROM opportunities o WHERE o.deleted_at IS NULL`;
    const countParams = [];
    if (status) {
      countSql += ' AND o.status = ?';
      countParams.push(status);
    }
    if (category) {
      countSql += ' AND o.category_id = ?';
      countParams.push(category);
    }
    if (keyword) {
      countSql += ' AND (o.title LIKE ? OR o.hotel_name LIKE ? OR o.city LIKE ?)';
      countParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    const [countResult] = await query(countSql, countParams);

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
    console.error('Admin get opportunities error:', err);
    res.status(500).json({ code: 500, message: '获取商机列表失败' });
  }
});

// P0-4：待审核商机列表（信用分 60~80 用户投稿需审核）
router.get('/pending', async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    const list = await query(
      `SELECT o.id, o.title, o.category_id, c.name as category_name, o.city, o.brand, o.price,
              o.created_at, o.audit_status, o.audit_reason,
              u.nickname as publisher_name, u.credit_score as publisher_credit
       FROM opportunities o
       LEFT JOIN opportunity_categories c ON o.category_id = c.id
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.deleted_at IS NULL AND o.audit_status = 'pending'
       ORDER BY o.created_at ASC
       LIMIT ? OFFSET ?`,
      [Number(pageSize), offset]
    );
    const [countResult] = await query(
      `SELECT COUNT(*) as total FROM opportunities WHERE deleted_at IS NULL AND audit_status = 'pending'`
    );

    res.json({
      code: 0,
      data: { list, total: countResult.total, page: Number(page), pageSize: Number(pageSize) },
    });
  } catch (err) {
    console.error('Admin pending opportunities error:', err);
    res.status(500).json({ code: 500, message: '获取待审核列表失败' });
  }
});
// 获取商机详情
router.get('/:id', async (req, res) => {
  try {
    const opportunity = await queryOne(
      `SELECT o.*, c.name as category_name, u.nickname as publisher_name
       FROM opportunities o
       LEFT JOIN opportunity_categories c ON o.category_id = c.id
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [req.params.id]
    );

    if (!opportunity) {
      return res.json({ code: 404, message: '商机不存在' });
    }

    // 获取无效标记
    const marks = await query(
      `SELECT m.*, u.nickname as user_name
       FROM opportunity_invalid_marks m
       LEFT JOIN users u ON m.user_id = u.id
       WHERE m.opportunity_id = ?`,
      [req.params.id]
    );

    res.json({
      code: 0,
      data: {
        ...opportunity,
        invalidMarks: marks,
      },
    });
  } catch (err) {
    console.error('Admin get opportunity detail error:', err);
    res.status(500).json({ code: 500, message: '获取商机详情失败' });
  }
});

// 更新商机状态（上架/下架）
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['active', 'inactive'].includes(status)) {
      return res.json({ code: 400, message: '状态值无效' });
    }

    await update('opportunities', { status }, 'id = ?', [req.params.id]);
    await recordLog(req.adminId, 'status_toggle', 'opportunity', req.params.id, { status });
    res.json({ code: 0, message: '状态更新成功' });
  } catch (err) {
    console.error('Admin update opportunity status error:', err);
    res.status(500).json({ code: 500, message: '更新状态失败' });
  }
});


// P0-4：商机审核（通过上架 / 驳回并通知投稿人）
router.put('/:id/audit', async (req, res) => {
  try {
    const { action, reason } = req.body || {};
    if (!['approve', 'reject'].includes(action)) {
      return res.json({ code: 400, message: 'action 需为 approve 或 reject' });
    }
    if (action === 'reject' && !reason) {
      return res.json({ code: 400, message: '驳回需填写原因' });
    }

    const opp = await queryOne(
      'SELECT id, user_id, title, audit_status FROM opportunities WHERE id = ? AND deleted_at IS NULL',
      [req.params.id]
    );
    if (!opp) {
      return res.json({ code: 404, message: '商机不存在' });
    }
    if (opp.audit_status !== 'pending') {
      return res.json({ code: 400, message: '该商机不在待审核状态' });
    }

    if (action === 'approve') {
      await update('opportunities', { audit_status: 'approved', status: 'active', audit_reason: null }, 'id = ?', [opp.id]);
      await query(
        `INSERT INTO notifications (user_id, type, title, content, related_type, related_id)
         VALUES (?, 'system', '商机审核通过', ?, 'opportunity', ?)`,
        [opp.user_id, `您投稿的商机「${opp.title}」已审核通过并上架`, opp.id]
      );
    } else {
      await update('opportunities', { audit_status: 'rejected', audit_reason: reason }, 'id = ?', [opp.id]);
      await query(
        `INSERT INTO notifications (user_id, type, title, content, related_type, related_id)
         VALUES (?, 'system', '商机审核驳回', ?, 'opportunity', ?)`,
        [opp.user_id, `您投稿的商机「${opp.title}」未通过审核：${reason}`, opp.id]
      );
    }
    await recordLog(req.adminId, action === 'approve' ? 'audit_approve' : 'audit_reject', 'opportunity', req.params.id, { action, reason });
    res.json({ code: 0, message: action === 'approve' ? '已通过并上架' : '已驳回' });
  } catch (err) {
    console.error('Admin audit opportunity error:', err);
    res.status(500).json({ code: 500, message: '审核操作失败' });
  }
});

export default router;
