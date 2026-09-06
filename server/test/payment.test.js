import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import bcrypt from 'bcryptjs';
import { createTestPool } from './helpers/db.js';

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
  const resp = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
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

describe('积分充值支付流程', () => {
  let token;

  before(async () => {
    // 独立测试用户：并行测试文件共享用户会互相污染（如 core 的封禁用例）
    const pool = await createTestPool();
    await pool.query(
      `INSERT INTO users (phone, nickname, password_hash, status, created_at)
       VALUES ('13800000061', '支付测试用户', ?, 'active', NOW())
       ON DUPLICATE KEY UPDATE nickname = '支付测试用户', status = 'active'`,
      [await bcrypt.hash('123456', 10)]
    );
    await pool.end();

    const res = await login('13800000061');
    assert.strictEqual(res.code, 0);
    token = res.data.token;
  });

  it('创建充值订单（mock 渠道）返回订单号与支付参数', async () => {
    const order = await apiPost('/points/recharge', { amount: 100, channel: 'mock' }, token);
    assert.strictEqual(order.code, 0);
    assert.ok(order.data.orderNo, '应返回订单号');
    assert.strictEqual(order.data.amount, 100);
    assert.strictEqual(order.data.channel, 'mock');
    assert.ok(order.data.payUrl, '应返回支付链接');
  });

  it('查询订单触发 mock 对账自动完成，积分到账', async () => {
    const order = await apiPost('/points/recharge', { amount: 50, channel: 'mock' }, token);
    const before = await apiGet('/points/balance', token);

    const status = await apiGet(`/points/recharge/order/${order.data.orderNo}`, token);
    assert.strictEqual(status.code, 0);
    assert.strictEqual(status.data.status, 'paid', 'mock 渠道查询时应自动结算为 paid');

    const after = await apiGet('/points/balance', token);
    assert.ok(
      after.data.balance - before.data.balance >= 50,
      '积分应增加至少 50'
    );
    assert.ok(
      after.data.total_recharged - before.data.total_recharged >= 50,
      '累计充值应增加'
    );
  });

  it('重复查询订单幂等，不重复加积分', async () => {
    const order = await apiPost('/points/recharge', { amount: 30, channel: 'mock' }, token);
    await apiGet(`/points/recharge/order/${order.data.orderNo}`, token);
    const after1 = await apiGet('/points/balance', token);

    await apiGet(`/points/recharge/order/${order.data.orderNo}`, token);
    const after2 = await apiGet('/points/balance', token);

    assert.strictEqual(after2.data.balance, after1.data.balance, '重复查询不应重复加积分');
  });

  it('无效金额创建订单失败', async () => {
    const res = await apiPost('/points/recharge', { amount: 0, channel: 'mock' }, token);
    assert.strictEqual(res.code, 400);
  });

  it('超限金额创建订单失败', async () => {
    const res = await apiPost('/points/recharge', { amount: 999999, channel: 'mock' }, token);
    assert.strictEqual(res.code, 400);
  });

  it('渠道列表返回 mock 默认渠道', async () => {
    const res = await apiGet('/points/recharge/channels', token);
    assert.strictEqual(res.code, 0);
    assert.ok(Array.isArray(res.data.channels));
    assert.ok(res.data.channels.includes('mock'));
    assert.ok(res.data.defaultChannel);
  });
});
