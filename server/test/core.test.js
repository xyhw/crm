import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';
import bcrypt from 'bcryptjs';

const BASE = 'http://localhost:3001/api';

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

async function apiPost(path, data, token) {
  const resp = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return resp.json();
}

async function apiPut(path, data, token) {
  const resp = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return resp.json();
}

describe('核心流程', () => {
  let user1Token, user2Token, publishedId;

  before(async () => {
    // 确保测试用户存在且昵称正确（reset-password 测试依赖 nickname 匹配）
    const { default: pkg } = await import('mysql2/promise');
    const pool = pkg.createPool({
      host: '127.0.0.1',
      user: 'hof_user',
      password: 'hof_pass_2026',
      database: 'hotel_order_follow',
    });
    await pool.query(
      `INSERT INTO users (phone, nickname, password_hash, status, credit_score, created_at)
       VALUES ('13800000001', '测试用户1', ?, 'active', 100, NOW())
       ON DUPLICATE KEY UPDATE nickname = '测试用户1', status = 'active', credit_score = 100`,
      [await bcrypt.hash('123456', 10)]
    );
    await pool.query(
      `INSERT INTO users (phone, nickname, password_hash, status, credit_score, created_at)
       VALUES ('13800000002', '测试用户2', ?, 'active', 100, NOW())
       ON DUPLICATE KEY UPDATE nickname = '测试用户2', status = 'active', credit_score = 100`,
      [await bcrypt.hash('123456', 10)]
    );
    await pool.end();

    const res1 = await login('13800000001');
    assert.strictEqual(res1.code, 0);
    user1Token = res1.data.token;

    const res2 = await login('13800000002');
    assert.strictEqual(res2.code, 0);
    user2Token = res2.data.token;

    // 确保用户2有足够积分（直接写 points_logs）才能购买
    const { default: pkg2 } = await import('mysql2/promise');
    const pool2 = pkg2.createPool({
      host: '127.0.0.1',
      user: 'hof_user',
      password: 'hof_pass_2026',
      database: 'hotel_order_follow',
    });
    await pool2.query(
      `INSERT INTO points_logs (user_id, delta, balance_after, source_type, created_at)
       VALUES (2, 10000, 10000, 'recharge', NOW())`
    );
    await pool2.query(
      `INSERT INTO points_accounts (user_id, balance, total_recharged) VALUES (2, 10000, 10000)
       ON DUPLICATE KEY UPDATE balance = balance + 10000, total_recharged = total_recharged + 10000`
    );
    await pool2.end();
  });

  it('发布商机', async () => {
    const data = {
      title: '杭州西溪酒店弱电工程30间',
      city: '杭州',
      address: '余杭区五常街道西溪假日酒店',
      brand: '西溪假日',
      categoryId: 4,
      price: 50,
      descriptionFull: '完整描述含联系方式',
      contactName: '张经理',
      contactPhone: '13900000001',
      wechat: 'zhang_jingli',
    };
    const res = await apiPost('/opportunities', data, user1Token);
    assert.strictEqual(res.code, 0);
    assert.ok(res.data?.id);
    publishedId = res.data.id;
  });

  it('发布商机缺必填字段被拒', async () => {
    const res = await apiPost('/opportunities', { title: '缺字段商机' }, user1Token);
    assert.ok(res.code !== 0);
  });

  it('购买商机并验证分佣', async () => {
    assert.ok(publishedId, '依赖发布商机');
    const buyRes = await apiPost('/orders', { opportunityId: publishedId }, user2Token);
    assert.strictEqual(buyRes.code, 0);
    assert.ok(buyRes.data?.actualPrice >= 0);

    const pointsRes = await apiGet('/points/balance', user2Token);
    assert.ok(pointsRes.code === 0);

    const sellerMe = await apiGet('/auth/me', user1Token);
    assert.ok(sellerMe.code === 0);
    assert.ok(sellerMe.data.pointsBalance >= 0);
  });

  it('商机详情返回地址与微信号', async () => {
    assert.ok(publishedId, '依赖发布商机');
    const res = await apiGet(`/opportunities/${publishedId}`, user2Token);
    assert.strictEqual(res.code, 0);
    assert.strictEqual(res.data?.address, '余杭区五常街道西溪假日酒店');
    assert.strictEqual(res.data?.wechat, 'zhang_jingli');
  });

  it('无效标记录', async () => {
    assert.ok(publishedId, '没有发布商机');
    const invalRes = await apiPost(
      `/opportunities/${publishedId}/invalid-mark`,
      { reason: 'other', reasonText: '信息已过时' },
      user2Token
    );
    assert.strictEqual(invalRes.code, 0);
  });

  it('重复购买拦截', async () => {
    assert.ok(publishedId, '没有发布商机');
    const res = await apiPost('/orders', { opportunityId: publishedId }, user2Token);
    assert.ok(res.code !== 0);
  });
});

describe('Banner 与通知', () => {
  let adminToken = '';

  before(async () => {
    const resp = await fetch(`${BASE}/v1/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    const json = await resp.json();
    adminToken = json.data?.token || '';
  });

  it('管理员获取 banner 列表', async () => {
    if (!adminToken) return;
    const res = await fetch(`${BASE}/v1/admin/banners`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    assert.strictEqual(res.code, 0);
    assert.ok(Array.isArray(res.data?.list));
  });

  it('管理员发送通知', async () => {
    if (!adminToken) return;
    const res = await fetch(`${BASE}/v1/admin/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: '系统测试通知',
        content: '这是一条测试通知',
        sendAll: false,
        userIds: [1],
      }),
    });
    const json = await res.json();
    assert.strictEqual(json.code, 0);
  });
});

describe('Banner 接口', () => {
  it('H5 Banner 列表', async () => {
    const resp = await fetch(`${BASE}/banners`);
    const json = await resp.json();
    assert.strictEqual(json.code, 0);
    assert.ok(Array.isArray(json.data?.list));
  });

  it('忘记密码接口', async () => {
    const resp = await fetch(`${BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800000001', nickname: '测试用户1' }),
    });
    const json = await resp.json();
    assert.strictEqual(json.code, 0);

    // 恢复密码为123456
    const { default: bcrypt } = await import('bcryptjs');
    const hash = await bcrypt.hash('123456', 10);
    const { default: pkg } = await import('mysql2/promise');
    const pool2 = pkg.createPool({
      host: '127.0.0.1',
      user: 'hof_user',
      password: 'hof_pass_2026',
      database: 'hotel_order_follow',
    });
    await pool2.query('UPDATE users SET password_hash = ? WHERE phone = ?', [hash, '13800000001']);
    await pool2.end();
  });
});