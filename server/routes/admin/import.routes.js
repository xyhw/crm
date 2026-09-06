import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import { adminAuthRequired } from '../../auth.js';
import { insert, queryOne } from '../../db.js';
import { recordLog } from '../../services/audit-log.service.js';
import crypto from 'crypto';

const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 5 * 1024 * 1024 } });
const router = Router();

function parseCsvLine(line) {
  const result = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      result.push(field.trim());
      field = '';
    } else {
      field += ch;
    }
  }
  result.push(field.trim());
  return result;
}

router.post('/', adminAuthRequired, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.json({ code: 400, message: '请选择CSV文件' });

    const fs = await import('fs');
    const csvContent = fs.readFileSync(req.file.path, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) return res.json({ code: 400, message: 'CSV文件格式错误：无数据行' });

    const headers = parseCsvLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));

    const fieldMap = {
      '标题': 'title', '分类ID': 'category_id', '城市': 'city',
      '酒店名称': 'hotel_name', '阶段': 'stage', '价格': 'price',
      '公开描述': 'description_public', '详细描述': 'description_full',
      '联系人': 'contact_name', '联系电话': 'contact_phone', '状态': 'status',
      '发布人用户ID': 'owner_user_id'
    };

    const errors = [], successes = [];
    const ownerCheck = new Map();

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCsvLine(lines[i]);
        const row = {};
        headers.forEach((h, idx) => {
          const key = fieldMap[h];
          if (key) row[key] = values[idx];
        });

        if (!row.title) continue;
        if (!row.category_id) row.category_id = 10;

        // 投稿归属必须是真实用户：分佣流向由 user_id 决定，禁止静默挂到导入管理员身上
        const ownerId = parseInt(row.owner_user_id, 10);
        if (!Number.isFinite(ownerId)) {
          errors.push(`第${i}行: 缺少或无效的「发布人用户ID」，跳过`);
          continue;
        }
        if (!ownerCheck.has(ownerId)) {
          ownerCheck.set(ownerId, await queryOne('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL', [ownerId]));
        }
        if (!ownerCheck.get(ownerId)) {
          errors.push(`第${i}行: 发布人用户 ${ownerId} 不存在，跳过`);
          continue;
        }

        const rawPrice = parseInt(row.price, 10);
        const price = Number.isFinite(rawPrice) && rawPrice >= 10 ? rawPrice : 50;

        await insert('opportunities', {
          user_id: ownerId,
          title: row.title,
          category_id: parseInt(row.category_id, 10),
          city: row.city || '',
          hotel_name: row.hotel_name || '',
          stage: row.stage || '',
          price,
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