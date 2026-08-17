import { Router } from 'express';
import multer from 'multer';
import { adminAuthRequired } from '../../auth.js';
import { insert, query } from '../../db.js';
import { recordLog } from '../../services/audit-log.service.js';
import crypto from 'crypto';

const upload = multer({ dest: '/tmp/opencode', limits: { fileSize: 5 * 1024 * 1024 } });
const router = Router();

router.post('/', adminAuthRequired, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.json({ code: 400, message: '请选择CSV文件' });

    const fs = await import('fs');
    const csvContent = fs.readFileSync(req.file.path, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) return res.json({ code: 400, message: 'CSV文件格式错误：无数据行' });

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    const fieldMap = {
      '标题': 'title', '分类ID': 'category_id', '城市': 'city', 
      '酒店名称': 'hotel_name', '阶段': 'stage', '价格': 'price',
      '公开描述': 'description_public', '详细描述': 'description_full',
      '联系人': 'contact_name', '联系电话': 'contact_phone'
    };

    const errors = [], successes = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((h, idx) => {
          const key = fieldMap[h];
          if (key) row[key] = values[idx];
        });

        if (!row.title || !row.email) continue;
        if (!row.category_id) row.category_id = 10;
        if (row.status && !['active', 'inactive'].includes(row.status)) row.status = 'active';

        await insert('opportunities', {
          user_id: req.adminId,
          title: row.title,
          category_id: parseInt(row.category_id),
          city: row.city || '',
          hotel_name: row.hotel_name || '',
          stage: row.stage || '',
          price: parseInt(row.price) || 50,
          description_public: row.description_public || '',
          description_full: row.description_full || '',
          contact_name: row.contact_name || '',
          contact_phone: row.contact_phone || '',
          status: 'active',
        });
        successes.push(row.title);
      } catch (e) {
        errors.push(`第${i}行: ${e.message}`);
      }
    }

    fs.unlinkSync(req.file.path);
    await recordLog(req.adminId, '批量导入商机', 'opportunity', 0, { successCount: successes.length, errorCount: errors.length });

    res.json({
      code: 0,
      data: { successCount: successes.length, errorCount: errors.length, errors: errors.length > 0 ? errors.slice(0, 10) : [] },
      message: `成功导入 ${successes.length} 条，失败 ${errors.length} 条`,
    });
  } catch (error) {
    console.error('[IMPORT CSV]', error.message);
    res.status(500).json({ code: 500, message: 'CSV导入失败' });
  }
});

export default router;