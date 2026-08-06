import { Router } from 'express';
import { query } from '../../db.js';

const router = Router();

// 获取积分流水
router.get('/', async (req, res) => {
  try {
    const { type, sourceType, keyword, page = 1, pageSize = 20 } = req.query;
    const filterType = sourceType || type;
    const offset = (Number(page) - 1) * Number(pageSize);

    let sql = `SELECT pl.*, u.nickname as user_name
               FROM points_logs pl
               LEFT JOIN users u ON pl.user_id = u.id
               WHERE 1=1`;
    const params = [];

    if (filterType) {
      sql += ' AND pl.source_type = ?';
      params.push(filterType);
    }
    if (keyword) {
      sql += ' AND (u.nickname LIKE ? OR u.phone LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY pl.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(pageSize), offset);

    const list = await query(sql, params);

    let countSql = 'SELECT COUNT(*) as total FROM points_logs pl LEFT JOIN users u ON pl.user_id = u.id WHERE 1=1';
    const countParams = [];
    if (filterType) {
      countSql += ' AND pl.source_type = ?';
      countParams.push(filterType);
    }
    if (keyword) {
      countSql += ' AND (u.nickname LIKE ? OR u.phone LIKE ?)';
      countParams.push(`%${keyword}%`, `%${keyword}%`);
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
    console.error('Admin get points logs error:', err);
    res.status(500).json({ code: 500, message: '获取积分流水失败' });
  }
});

export default router;
