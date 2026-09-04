import { describe, it, before } from 'node:test';
import assert from 'node:assert';

const BASE = 'http://localhost:3001/api';

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

async function adminPost(path, token) {
  const resp = await fetch(`${BASE}/v1/admin${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return resp.json();
}

describe('后台充值对账', () => {
  let token;

  before(async () => {
    token = await adminLogin();
    assert.ok(token, '管理员登录失败');
  });

  it('未带 token 拒绝访问', async () => {
    const resp = await fetch(`${BASE}/v1/admin/recharge-orders`);
    assert.strictEqual(resp.status, 401);
  });

  it('订单列表返回分页结构', async () => {
    const res = await adminGet('/recharge-orders?pageSize=5', token);
    assert.strictEqual(res.code, 0);
    assert.ok(Array.isArray(res.data.list));
    assert.strictEqual(res.data.pageSize, 5);
    assert.ok(res.data.list.length <= 5);
  });

  it('状态与渠道筛选生效', async () => {
    const res = await adminGet('/recharge-orders?status=paid&channel=mock&pageSize=5', token);
    assert.strictEqual(res.code, 0);
    for (const row of res.data.list) {
      assert.strictEqual(row.status, 'paid');
      assert.strictEqual(row.channel, 'mock');
    }
  });

  it('非法状态值被忽略而非报错', async () => {
    const res = await adminGet('/recharge-orders?status=DROP&pageSize=3', token);
    assert.strictEqual(res.code, 0);
  });

  it('对账汇总：已支付订单积分与流水入账一致', async () => {
    const res = await adminGet('/recharge-orders/summary', token);
    assert.strictEqual(res.code, 0);
    const r = res.data.reconcile;
    assert.strictEqual(r.paidOrderPoints, r.ledgerRechargePoints, '已支付订单积分与入账流水不一致');
    assert.strictEqual(r.missingLedgerOrders, 0, '存在已支付但未入账的订单');
  });

  it('查单补账：订单不存在返回 404', async () => {
    const res = await adminPost('/recharge-orders/NOT_EXIST_ORDER/sync', token);
    assert.strictEqual(res.code, 404);
  });

  it('查单补账：已支付订单返回幂等结果', async () => {
    const list = await adminGet('/recharge-orders?status=paid&pageSize=1', token);
    const paid = list.data.list[0];
    if (!paid) return;
    const res = await adminPost(`/recharge-orders/${paid.order_no}/sync`, token);
    assert.strictEqual(res.code, 0);
    assert.strictEqual(res.data.already, true);
  });
});
