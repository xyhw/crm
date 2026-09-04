import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import bcrypt from 'bcryptjs';

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

async function adminPost(path, token, body) {
  const resp = await fetch(`${BASE}/v1/admin${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return resp.json();
}

async function userLogin(phone = '13800000001', password = '123456') {
  const resp = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  const json = await resp.json();
  return json.data?.token || '';
}

async function userGet(path, token) {
  const resp = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return resp.json();
}

async function userPost(path, data, token) {
  const resp = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return resp.json();
}

/** 建一笔已支付的 mock 充值单：mock 渠道在查单时自动结算 */
async function createPaidOrder(userToken, amount) {
  const order = await userPost('/points/recharge', { amount, channel: 'mock' }, userToken);
  assert.strictEqual(order.code, 0, '创建充值订单失败');
  const status = await userGet(`/points/recharge/order/${order.data.orderNo}`, userToken);
  assert.strictEqual(status.data.status, 'paid', 'mock 单应自动结算');
  return order.data.orderNo;
}

describe('后台充值对账', () => {
  let token;
  let userToken;

  before(async () => {
    token = await adminLogin();
    assert.ok(token, '管理员登录失败');

    const { default: pkg } = await import('mysql2/promise');
    const pool = pkg.createPool({
      host: '127.0.0.1',
      user: 'hof_user',
      password: 'hof_pass_2026',
      database: 'hotel_order_follow',
    });
    await pool.query(
      `INSERT INTO users (phone, nickname, password_hash, status, created_at)
       VALUES ('13800000001', '测试用户1', ?, 'active', NOW())
       ON DUPLICATE KEY UPDATE nickname = '测试用户1', status = 'active'`,
      [await bcrypt.hash('123456', 10)]
    );
    await pool.end();

    userToken = await userLogin();
    assert.ok(userToken, '用户登录失败');
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

  it('退款记账：扣回积分、订单转 refunded、写 refund 流水', async () => {
    const orderNo = await createPaidOrder(userToken, 60);
    const before = await userGet('/points/balance', userToken);

    const res = await adminPost(`/recharge-orders/${orderNo}/refund`, token, { reason: '用户误充' });
    assert.strictEqual(res.code, 0, res.message);
    assert.strictEqual(res.data.points, 60);
    assert.strictEqual(res.data.already, false);

    const after = await userGet('/points/balance', userToken);
    assert.strictEqual(
      after.data.balance,
      before.data.balance - 60,
      '退款应扣回 60 积分'
    );

    const detail = await adminGet(`/recharge-orders?orderNo=${orderNo}`, token);
    assert.strictEqual(detail.data.list[0].status, 'refunded');
    assert.ok(detail.data.list[0].refunded_at, '应记录退款时间');

    const logs = await userGet('/points/logs?pageSize=5', userToken);
    const refundLog = logs.data.list.find((l) => l.source_type === 'refund' && l.delta === -60);
    assert.ok(refundLog, '应写入 refund 流水');
  });

  it('退款记账：重复提交幂等', async () => {
    const orderNo = await createPaidOrder(userToken, 40);
    const first = await adminPost(`/recharge-orders/${orderNo}/refund`, token, { reason: '重复测试' });
    assert.strictEqual(first.code, 0);
    const mid = await userGet('/points/balance', userToken);

    const second = await adminPost(`/recharge-orders/${orderNo}/refund`, token, { reason: '重复测试' });
    assert.strictEqual(second.code, 0);
    assert.strictEqual(second.data.already, true, '第二次应识别为已退款');

    const after = await userGet('/points/balance', userToken);
    assert.strictEqual(after.data.balance, mid.data.balance, '重复退款不应重复扣分');
  });

  it('退款记账：缺少原因返回 400', async () => {
    const orderNo = await createPaidOrder(userToken, 20);
    const res = await adminPost(`/recharge-orders/${orderNo}/refund`, token, { reason: ' ' });
    assert.strictEqual(res.code, 400);
  });

  it('退款记账：订单不存在返回 404', async () => {
    const res = await adminPost('/recharge-orders/NOT_EXIST_ORDER/refund', token, { reason: '测试' });
    assert.strictEqual(res.code, 404);
  });

  it('退款记账：非已支付订单被拒绝', async () => {
    const order = await userPost('/points/recharge', { amount: 25, channel: 'mock' }, userToken);
    const res = await adminPost(`/recharge-orders/${order.data.orderNo}/refund`, token, { reason: '待支付单' });
    assert.strictEqual(res.code, 400);
  });

  it('对账汇总：退款订单均已冲销流水', async () => {
    const res = await adminGet('/recharge-orders/summary', token);
    assert.strictEqual(res.code, 0);
    assert.ok(res.data.refund, '应返回退款汇总');
    assert.strictEqual(res.data.refund.missingLedgerOrders, 0, '存在已退款但未冲销的订单');
  });
});
