import { Router } from 'express';
import { query, queryOne, update } from '../../db.js';
import { recordLog } from '../../services/audit-log.service.js';

const router = Router();

// 获取跟单列表
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
    res.status(500).json({ code: 500, message: '获取跟单列表失败' });
  }
});

// 获取跟单详情
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
      return res.json({ code: 404, message: '跟单不存在' });
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
    res.status(500).json({ code: 500, message: '获取跟单详情失败' });
  }
});

// 更新跟单状态（上架/下架）
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

export default router;
