import { Router } from 'express';
import { query, queryOne, insert, update, transaction } from '../../db.js';

const router = Router();

// Banner列表（含inactive）
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    const list = await query(
      'SELECT * FROM banners ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?',
      [Number(pageSize), offset]
    );
    const [countResult] = await query('SELECT COUNT(*) as total FROM banners');

    res.json({
      code: 0,
      data: { list, total: countResult.total, page: Number(page), pageSize: Number(pageSize) },
    });
  } catch (err) {
    console.error('Admin get banners error:', err);
    res.status(500).json({ code: 500, message: '获取Banner列表失败' });
  }
});

// 获取单个Banner
router.get('/:id', async (req, res) => {
  try {
    const banner = await queryOne('SELECT * FROM banners WHERE id = ?', [req.params.id]);
    if (!banner) return res.json({ code: 404, message: 'Banner不存在' });
    res.json({ code: 0, data: banner });
  } catch (err) {
    console.error('Admin get banner error:', err);
    res.status(500).json({ code: 500, message: '获取Banner失败' });
  }
});

// 创建Banner
router.post('/', async (req, res) => {
  try {
    const { title, imageUrl, linkUrl, sortOrder, startAt, endAt } = req.body || {};
    if (!title || !imageUrl) {
      return res.json({ code: 400, message: '标题和图片不能为空' });
    }
    const result = await insert('banners', {
      title,
      image_url: imageUrl,
      link_url: linkUrl || '',
      sort_order: sortOrder ?? 0,
      start_at: startAt || null,
      end_at: endAt || null,
      status: 'active',
    });
    res.json({ code: 0, data: { id: result.insertId } });
  } catch (err) {
    console.error('Admin create banner error:', err);
    res.status(500).json({ code: 500, message: '创建Banner失败' });
  }
});

// 更新Banner
router.put('/:id', async (req, res) => {
  try {
    const { title, imageUrl, linkUrl, sortOrder, status, startAt, endAt } = req.body || {};
    const data = {};
    if (title !== undefined) data.title = title;
    if (imageUrl !== undefined) data.image_url = imageUrl;
    if (linkUrl !== undefined) data.link_url = linkUrl;
    if (sortOrder !== undefined) data.sort_order = sortOrder;
    if (status !== undefined) data.status = status;
    if (startAt !== undefined) data.start_at = startAt || null;
    if (endAt !== undefined) data.end_at = endAt || null;

    if (Object.keys(data).length === 0) {
      return res.json({ code: 400, message: '无更新字段' });
    }

    await update('banners', data, 'id = ?', [req.params.id]);
    res.json({ code: 0, message: '更新成功' });
  } catch (err) {
    console.error('Admin update banner error:', err);
    res.status(500).json({ code: 500, message: '更新Banner失败' });
  }
});

// 删除Banner
router.delete('/:id', async (req, res) => {
  try {
    await deleteOrder('DELETE FROM banners WHERE id = ?', [req.params.id]);
    res.json({ code: 0, message: '删除成功' });
  } catch (err) {
    console.error('Admin delete banner error:', err);
    res.status(500).json({ code: 500, message: '删除Banner失败' });
  }
});

export default router;