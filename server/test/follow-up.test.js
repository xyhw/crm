import { describe, it, before } from 'node:test';
import assert from 'node:assert';

const BASE = 'http://localhost:3001/api';

async function apiGet(path, token) {
  const resp = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return resp.json();
}

async function apiPost(path, data, token) {
  const resp = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(data),
  });
  return resp.json();
}

async function registerIfAbsent(phone, extra = {}) {
  const res = await apiPost('/auth/register', { phone, password: '123456', nickname: `T${phone.slice(-4)}`, ...extra });
  if (res.code !== 0 && res.code !== 400) {
    throw new Error(`register failed: ${JSON.stringify(res)}`);
  }
  return res;
}

async function ensureLogin(phone) {
  const res = await apiPost('/auth/login', { phone, password: '123456' });
  if (res.code !== 0) throw new Error(`login failed: ${JSON.stringify(res)}`);
  return res.data.token;
}

async function grantPoints(userId, amount) {
  const { default: pkg } = await import('mysql2/promise');
  const pool = pkg.createPool({
    host: '127.0.0.1',
    user: 'hof_user',
    password: 'hof_pass_2026',
    database: 'hotel_order_follow',
  });
  await pool.query(
    'INSERT INTO points_accounts (user_id, balance, total_recharged) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE balance = balance + ?, total_recharged = total_recharged + ?',
    [userId, amount, amount, amount, amount]
  );
  await pool.end();
}

async function getUserId(phone) {
  const { default: pkg } = await import('mysql2/promise');
  const pool = pkg.createPool({
    host: '127.0.0.1',
    user: 'hof_user',
    password: 'hof_pass_2026',
    database: 'hotel_order_follow',
  });
  const [rows] = await pool.query('SELECT id FROM users WHERE phone = ?', [phone]);
  await pool.end();
  return rows[0]?.id;
}

async function forceApproveShare(shareId) {
  const { default: pkg } = await import('mysql2/promise');
  const pool = pkg.createPool({
    host: '127.0.0.1',
    user: 'hof_user',
    password: 'hof_pass_2026',
    database: 'hotel_order_follow',
  });
  await pool.query('UPDATE follow_up_shares SET audit_status = "approved" WHERE id = ?', [shareId]);
  await pool.end();
}

describe('Follow-up 分享摘要 / 标记有用 校验', () => {
  let userAToken, userBToken, userCToken;
  let opportunityId, shareId;

  before(async () => {
    // 三方用户：A 发布者、B 购买者、C 未购买（使用独立手机号避开限流）
    await registerIfAbsent('13800000021');
    await registerIfAbsent('13800000022');
    await registerIfAbsent('13800000023');
    userAToken = await ensureLogin('13800000021');
    userBToken = await ensureLogin('13800000022');
    userCToken = await ensureLogin('13800000023');

    const userBId = await getUserId('13800000022');
    await grantPoints(userBId, 5000);

    // 用户 A 发布商机
    const publishRes = await apiPost('/opportunities', {
      title: 'FollowUp 防作弊测试商机',
      categoryId: 4,
      brand: '测试品牌',
      city: '杭州',
      contactName: '王经理',
      contactPhone: '13900000001',
      price: 50,
      descriptionFull: '概要',
    }, userAToken);
    assert.strictEqual(publishRes.code, 0);
    opportunityId = publishRes.data.id;

    // 用户 B 购买商机
    const buyRes = await apiPost('/orders', { opportunityId }, userBToken);
    assert.strictEqual(buyRes.code, 0);

    // 用户 B 分享摘要
    const shareRes = await apiPost('/follow-ups/share', {
      opportunityId,
      status: 'interested',
      summary: 'B 的跟进摘要',
    }, userBToken);
    assert.strictEqual(shareRes.code, 0);
    shareId = shareRes.data.id;
    await forceApproveShare(shareId);
  });

  // ----- 分享摘要 基础校验 -----

  it('未购买者分享摘要被拒（400）', async () => {
    const res = await apiPost('/follow-ups/share', {
      opportunityId,
      status: 'interested',
      summary: 'C 的分享',
    }, userCToken);
    assert.strictEqual(res.code, 400);
    assert.match(res.message, /购买者/);
  });

  it('分享参数缺失被拒（400）', async () => {
    const res = await apiPost('/follow-ups/share', { summary: '缺参' }, userBToken);
    assert.strictEqual(res.code, 400);
  });

  // ----- 标记有用 防作弊 -----

  it('未登录标记有用被拒（401）', async () => {
    const res = await apiPost('/follow-ups/helpful', { shareId });
    assert.strictEqual(res.code, 401);
  });

  it('参数缺失返回 400', async () => {
    const res = await apiPost('/follow-ups/helpful', {}, userCToken);
    assert.strictEqual(res.code, 400);
  });

  it('不存在的 shareId 返回 404', async () => {
    const res = await apiPost('/follow-ups/helpful', { shareId: 99999999 }, userCToken);
    assert.strictEqual(res.code, 404);
  });

  it('未购买同商机者标记有用被拒（403）', async () => {
    const res = await apiPost('/follow-ups/helpful', { shareId }, userCToken);
    assert.strictEqual(res.code, 403);
    assert.match(res.message, /购买同条商机/);
  });

  it('分享者自己标记有用被拒（403）', async () => {
    const res = await apiPost('/follow-ups/helpful', { shareId }, userBToken);
    assert.strictEqual(res.code, 403);
    assert.match(res.message, /不能给自己/);
  });

  it('跨商机标记被拒（403）', async () => {
    // A 发布第二个商机
    const publishRes = await apiPost('/opportunities', {
      title: 'FollowUp 第二个商机',
      categoryId: 4,
      brand: '品牌B',
      city: '北京',
      contactName: '李经理',
      contactPhone: '13900000002',
      price: 60,
      descriptionFull: '概要2',
    }, userAToken);
    assert.strictEqual(publishRes.code, 0);
    const opp2 = publishRes.data.id;

    // B 购买商机2 并分享摘要
    const buyRes = await apiPost('/orders', { opportunityId: opp2 }, userBToken);
    assert.strictEqual(buyRes.code, 0);

    const shareRes = await apiPost('/follow-ups/share', {
      opportunityId: opp2,
      status: 'negotiating',
      summary: '商机2摘要',
    }, userBToken);
    assert.strictEqual(shareRes.code, 0);
    await forceApproveShare(shareRes.data.id);

    // C 未购买任何商机 → 跨商机标记应被拒
    const res = await apiPost('/follow-ups/helpful', { shareId: shareRes.data.id }, userCToken);
    assert.strictEqual(res.code, 403);
  });
});
