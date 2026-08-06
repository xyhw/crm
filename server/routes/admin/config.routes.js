import { Router } from 'express';
import { query } from '../../db.js';
import { update } from '../../db.js';
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
      await update(
        'system_configs',
        { config_value: String(body[key]) },
        'config_key = ?',
        [key]
      );
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

    await update('system_configs', { config_value: String(value) }, 'config_key = ?', [req.params.key]);
    await recordLog(req.adminId, 'edit', 'system_configs', null, { [req.params.key]: value });
    res.json({ code: 0, message: '配置更新成功' });
  } catch (err) {
    console.error('Admin update config error:', err);
    res.status(500).json({ code: 500, message: '更新配置失败' });
  }
});

function parseConfigValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  const num = Number(value);
  if (value !== '' && !Number.isNaN(num)) return num;
  return value;
}

export default router;
