import { Router } from 'express';
import { adminAuthRequired } from '../../auth.js';
import { query } from '../../db.js';

const router = Router();

router.get('/', adminAuthRequired, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, action, targetType, keyword } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let sql = 'FROM operation_logs ol LEFT JOIN admin_users au ON ol.admin_id = au.id WHERE 1=1';
    const params = [];

    if (action) {
      sql += ' AND ol.action = ?';
      params.push(action);
    }
    if (targetType) {
      sql += ' AND ol.target_type = ?';
      params.push(targetType);
    }
    if (keyword) {
      sql += ' AND (au.name LIKE ? OR ol.detail LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }

    const [countResult] = await query(`SELECT COUNT(*) as total ${sql}`, params);
    const list = await query(
      `SELECT ol.*, au.name as admin_name ${sql} ORDER BY ol.created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    );

    res.json({
      code: 0,
      data: { list, total: countResult.total, page: Number(page), pageSize: Number(pageSize) },
    });
  } catch (error) {
    console.error('[Audit Logs]', error.message);
    res.status(500).json({ code: 500, message: '获取日志失败' });
  }
});

export default router;