import { Router } from 'express';
import { query } from '../../db.js';

const router = Router();

// 获取订单列表
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let sql = `SELECT o.*, u.nickname as buyer_name, opp.title as opportunity_title, su.nickname as seller_name
               FROM orders o
               LEFT JOIN users u ON o.user_id = u.id
               LEFT JOIN opportunities opp ON o.opportunity_id = opp.id
               LEFT JOIN users su ON opp.user_id = su.id
               WHERE 1=1`;
    const params = [];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(pageSize), offset);

    const list = await query(sql, params);

    let countSql = 'SELECT COUNT(*) as total FROM orders o WHERE 1=1';
    const countParams = [];
    if (status) {
      countSql += ' AND o.status = ?';
      countParams.push(status);
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
    console.error('Admin get orders error:', err);
    res.status(500).json({ code: 500, message: '获取订单列表失败' });
  }
});

export default router;
