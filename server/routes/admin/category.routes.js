import { Router } from 'express';
import { query, queryOne, insert, update } from '../../db.js';
import { audit } from '../../services/audit-log.service.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const list = await query('SELECT * FROM opportunity_categories ORDER BY sort_order, id');
    res.json({ code: 0, data: { list } });
  } catch (err) {
    res.status(500).json({ code: 500, message: '获取分类失败' });
  }
});

router.post('/', audit('category', 'create', (req, res, body) => body?.data?.id ?? null), async (req, res) => {
  try {
    const { name, icon, sortOrder } = req.body || {};
    if (!name) return res.json({ code: 400, message: '分类名称不能为空' });
    const result = await insert('opportunity_categories', {
      name, icon: icon || '', sort_order: sortOrder || 0, status: 'active',
    });
    res.json({ code: 0, data: { id: result.insertId } });
  } catch (err) {
    res.status(500).json({ code: 500, message: '创建分类失败' });
  }
});

router.put('/:id', audit('category', 'edit'), async (req, res) => {
  try {
    const { name, icon, sortOrder, status } = req.body || {};
    const data = {};
    if (name !== undefined) data.name = name;
    if (icon !== undefined) data.icon = icon;
    if (sortOrder !== undefined) data.sort_order = sortOrder;
    if (status !== undefined) data.status = status;
    if (Object.keys(data).length === 0) return res.json({ code: 400, message: '无更新字段' });
    await update('opportunity_categories', data, 'id = ?', [req.params.id]);
    res.json({ code: 0, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: '更新失败' });
  }
});

router.delete('/:id', audit('category', 'delete'), async (req, res) => {
  try {
    await query('DELETE FROM opportunity_categories WHERE id = ?', [req.params.id]);
    res.json({ code: 0, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: '删除失败' });
  }
});

export default router;