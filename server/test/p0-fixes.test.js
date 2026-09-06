import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import bcrypt from 'bcryptjs';

const BASE = 'http://localhost:3001/api';

async function getPool() {
  const { default: mysql } = await import('mysql2/promise');
  return mysql.createPool({
    host: process.env.TEST_DB_HOST || '127.0.0.1',
    user: process.env.TEST_DB_USER || 'hof_user',
    password: process.env.TEST_DB_PASS || 'hof_pass_2026',
    database: process.env.TEST_DB_NAME || 'hotel_order_follow',
  });
}

async function login(phone, password = '123456') {
  const resp = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  return resp.json();
}

async function apiGet(path, token) {
  const resp = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return resp.json();
}

async function adminLogin() {
  const resp = await fetch(`${BASE}/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const json = await resp.json();
  return json.data?.token || '';
}

async function adminGet(path, token) {
  const resp = await fetch(`${BASE}/v1/admin${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return resp.json();
}

async function adminPut(path, body, token) {
  const resp = await fetch(`${BASE}/v1/admin${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return resp.json();
}

describe('P0 修复回归', () => {
  let userToken, adminToken;

  before(async () => {
    // 确保测试用户存在（与 core.test.js 共用 13800000001 账号）
    const pool = await getPool();
    await pool.query(
      `INSERT INTO users (phone, nickname, password_hash, status, credit_score, created_at)
       VALUES ('13800000001', '测试用户1', ?, 'active', 100, NOW())
       ON DUPLICATE KEY UPDATE status = 'active'`,
      [await bcrypt.hash('123456', 10)]
    );
    await pool.end();

    const res = await login('13800000001');
    assert.strictEqual(res.code, 0);
    userToken = res.data.token;

    adminToken = await adminLogin();
    assert.ok(adminToken, '管理员登录失败');
  });

  it('个人统计接口返回有效等级（stats level 修复）', async () => {
    const res = await apiGet('/stats/me', userToken);
    assert.strictEqual(res.code, 0);
    assert.ok(res.data.level, 'level 字段缺失');
    assert.strictEqual(typeof res.data.level.level, 'string', 'level.level 应为字符串');
  });

  it('pageSize 超大值被钳制（防拖库）', async () => {
    const res = await apiGet('/opportunities?pageSize=999999', userToken);
    assert.strictEqual(res.code, 0);
    assert.ok(Number(res.data.pageSize) <= 500, 'pageSize 未被钳制到上限以内');
    assert.ok(Array.isArray(res.data.list));
  });

  it('非法 page/pageSize 回退默认值而非报错', async () => {
    const res = await apiGet('/opportunities?page=abc&pageSize=-1', userToken);
    assert.strictEqual(res.code, 0);
    assert.strictEqual(Number(res.data.page), 1);
    assert.strictEqual(Number(res.data.pageSize), 20);
  });

  it('后台财务汇总正常返回（users 软删过滤修复）', async () => {
    const res = await adminGet('/finance', adminToken);
    assert.strictEqual(res.code, 0);
    assert.ok(res.data.users && typeof res.data.users.total === 'number');
    assert.ok(Number(res.data.users.active) <= Number(res.data.users.total));
  });

  it('系统配置拒绝白名单外的 key', async () => {
    const res = await adminPut('/configs', { evil_key_not_allowed: 'x' }, adminToken);
    assert.strictEqual(res.code, 400);
  });

  it('白名单内配置键可正常写入', async () => {
    const res = await adminPut('/configs', { points_recharge_limit: 10000 }, adminToken);
    assert.strictEqual(res.code, 0);
  });
});
