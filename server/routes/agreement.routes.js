import { Router } from 'express';
import { queryOne } from '../db.js';

const router = Router();

const ALLOWED_TYPES = ['agreement', 'privacy', 'summary', 'disclaimer', 'service', 'refund', 'complaint'];

// 获取协议内容（动态配置，配置缺失时返回 404，前端回退静态内容）
router.get('/:type', async (req, res) => {
  try {
    const type = req.params.type;
    if (!ALLOWED_TYPES.includes(type)) {
      return res.json({ code: 404, message: '协议类型不存在' });
    }

    const row = await queryOne(
      'SELECT config_value FROM system_configs WHERE config_key = ?',
      [`agreement_${type}`]
    );

    if (!row || !row.config_value) {
      return res.json({ code: 404, message: '协议内容未配置' });
    }

    let content;
    try {
      content = JSON.parse(row.config_value);
    } catch {
      return res.json({ code: 500, message: '协议配置格式错误' });
    }

    res.json({
      code: 0,
      data: {
        type,
        title: content.title || '',
        sections: Array.isArray(content.sections) ? content.sections : [],
        updatedAt: row.updated_at,
      },
    });
  } catch (err) {
    console.error('Get agreement error:', err);
    res.status(500).json({ code: 500, message: '获取协议失败' });
  }
});

export default router;
