import { Router } from 'express';
import { query, queryOne, insert, update } from '../../db.js';
import { recordLog } from '../../services/audit-log.service.js';

const router = Router();

// 获取系统配置（返回对象形式）
router.get('/', async (req, res) => {
  try {
    const configs = await query('SELECT * FROM system_configs ORDER BY config_key');
    const map = {};
    for (const c of configs) {
      map[c.config_key] = parseConfigValue(c.config_value);
    }
    res.json({ code: 0, data: map });
  } catch (err) {
    console.error('Admin get configs error:', err);
    res.status(500).json({ code: 500, message: '获取系统配置失败' });
  }
});

// 批量更新系统配置（body: { key: value, ... }）
router.put('/', async (req, res) => {
  try {
    const body = req.body || {};
    const keys = Object.keys(body).filter((k) => body[k] !== undefined);
    if (keys.length === 0) {
      return res.json({ code: 400, message: '请填写配置值' });
    }

    for (const key of keys) {
      await upsertConfig(key, body[key], req.adminId);
    }
    await recordLog(req.adminId, 'edit', 'system_configs', null, keys.reduce((acc, k) => ({ ...acc, [k]: body[k] }), {}));
    res.json({ code: 0, message: '配置更新成功' });
  } catch (err) {
    console.error('Admin update config error:', err);
    res.status(500).json({ code: 500, message: '更新配置失败' });
  }
});

// 兼容旧接口：更新单个配置
router.put('/:key', async (req, res) => {
  try {
    const { value } = req.body || {};
    if (value === undefined) {
      return res.json({ code: 400, message: '请填写配置值' });
    }

    await upsertConfig(req.params.key, value, req.adminId);
    await recordLog(req.adminId, 'edit', 'system_configs', null, { [req.params.key]: value });
    res.json({ code: 0, message: '配置更新成功' });
  } catch (err) {
    console.error('Admin update config error:', err);
    res.status(500).json({ code: 500, message: '更新配置失败' });
  }
});

function storeValue(value) {
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
}

function typeOfValue(value) {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'object' && value !== null) return 'json';
  return 'string';
}

async function upsertConfig(key, value, adminId) {
  const storedValue = storeValue(value);
  const configType = typeOfValue(value);
  const affected = await update(
    'system_configs',
    { config_value: storedValue, config_type: configType, updated_by: adminId },
    'config_key = ?',
    [key]
  );
  if (affected === 0) {
    const existing = await queryOne('SELECT config_key FROM system_configs WHERE config_key = ?', [key]);
    if (!existing) {
      await insert('system_configs', {
        config_key: key,
        config_value: storedValue,
        config_type: configType,
        updated_by: adminId,
      });
    } else {
      // 并发场景下 select 后行已被创建，仅更新
      await update(
        'system_configs',
        { config_value: storedValue, config_type: configType, updated_by: adminId },
        'config_key = ?',
        [key]
      );
    }
  }
}

function parseConfigValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  const num = Number(value);
  if (value !== '' && !Number.isNaN(num)) return num;
  return value;
}

export default router;
