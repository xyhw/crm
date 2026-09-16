import { describe, it, before } from 'node:test';
import assert from 'node:assert';

const BASE = process.env.TEST_BASE || 'http://localhost:3001/api';

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

async function apiPut(path, data, token) {
  const resp = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(data),
  });
  return resp.json();
}

// 注册（已存在则忽略），然后登录拿 token
async function ensureUser(phone, creditScore) {
  const reg = await apiPost('/auth/register', { phone, password: 'test1234', nickname: `P0${phone.slice(-4)}` });
  if (reg.code !== 0 && reg.code !== 400) {
    throw new Error(`register failed: ${JSON.stringify(reg)}`);
  }
  if (creditScore !== undefined) {
    // 直连 SQL 设置信用分（注册接口不接收 credit_score）
    const { default: pkg } = await import('mysql2/promise');
    const conn = await pkg.createConnection({
      host: '127.0.0.1', user: 'hof_user', password: 'hof_pass_2026', database: 'hotel_order_follow',
    });
    await conn.query('UPDATE users SET credit_score = ? WHERE phone = ?', [creditScore, phone]);
    await conn.end();
  }
  const login = await apiPost('/auth/login', { phone, password: 'test1234' });
  assert.strictEqual(login.code, 0, `login failed: ${JSON.stringify(login)}`);
  return login.data.token;
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

describe('P0 优化能力（信用阶梯审核 / 管理员审核 / 分佣比例 / 积分有效期 / 登录打卡）', () => {
  let midToken;      // 信用分 65：60~80 需审核
  let highToken;     // 信用分 90：≥80 即时上架
  let adminToken;
  let pendingOppId;

  before(async () => {
    midToken = await ensureUser('13700077001', 65);
    highToken = await ensureUser('13700077002', 90);
    adminToken = await adminLogin();
    assert.ok(adminToken, '管理员登录失败');

    // 高信用分用户充值（确保购买路径可达）
    const { default: pkg } = await import('mysql2/promise');
    const conn = await pkg.createConnection({
      host: '127.0.0.1', user: 'hof_user', password: 'hof_pass_2026', database: 'hotel_order_follow',
    });
    await conn.query(
      `INSERT INTO points_accounts (user_id, balance, total_recharged)
       SELECT id, 1000, 1000 FROM users WHERE phone = '13700077002'
       ON DUPLICATE KEY UPDATE balance = balance + 1000, total_recharged = total_recharged + 1000`
    );
    await conn.query(
      `INSERT INTO points_logs (user_id, delta, balance_after, source_type, created_at)
       SELECT id, 1000, 1000, 'recharge', NOW() FROM users WHERE phone = '13700077002'`
    );
    await conn.end();
  });

  it('信用分 60~80 用户投稿进入待审核（audit_status=pending，公开列表不可见）', async () => {
    const res = await apiPost('/opportunities', {
      title: 'P0审核测试-宁波酒店暖通工程',
      city: '宁波',
      address: '鄞州区测试路1号',
      brand: '测试品牌',
      categoryId: 4,
      price: 30,
      descriptionFull: 'P0 审核测试完整描述',
      contactName: '王经理',
      contactPhone: '13900007701',
      wechat: 'p0_audit_test',
    }, midToken);
    assert.strictEqual(res.code, 0);
    assert.ok(res.data?.id);
    pendingOppId = res.data.id;
    assert.strictEqual(res.data.auditStatus, 'pending', `应进入待审核，实际 ${res.data.auditStatus}`);

    // 公开列表不出现待审核商机
    const list = await apiGet('/opportunities?page=1&pageSize=500');
    assert.strictEqual(list.code, 0);
    assert.ok(!list.data.list.some((o) => o.id === pendingOppId), '待审核商机不应出现在公开列表');
  });

  it('信用分 ≥80 用户投稿即时上架（audit_status=none）', async () => {
    const res = await apiPost('/opportunities', {
      title: 'P0即时上架测试-苏州酒店客房改造',
      city: '苏州',
      address: '工业园区测试路2号',
      brand: '测试品牌B',
      categoryId: 4,
      price: 30,
      descriptionFull: 'P0 即时上架测试完整描述',
      contactName: '李经理',
      contactPhone: '13900007702',
      wechat: 'p0_instant_test',
    }, highToken);
    assert.strictEqual(res.code, 0);
    assert.strictEqual(res.data.auditStatus, 'none', `高信用分应即时上架，实际 ${res.data.auditStatus}`);
  });

  it('待审核商机对投稿人本人可见（详情可查）', async () => {
    const detail = await apiGet(`/opportunities/${pendingOppId}`, midToken);
    assert.strictEqual(detail.code, 0);
    assert.strictEqual(detail.data.id, pendingOppId);
  });

  it('管理员获取待审核列表包含该商机', async () => {
    const res = await apiGet('/v1/admin/opportunities/pending?page=1&pageSize=100', adminToken);
    assert.strictEqual(res.code, 0);
    assert.ok(res.data.list.some((o) => o.id === pendingOppId), '待审核列表应包含该商机');
  });

  it('管理员驳回必须填写原因', async () => {
    const res = await apiPut(`/v1/admin/opportunities/${pendingOppId}/audit`, { action: 'reject' }, adminToken);
    assert.strictEqual(res.code, 400);
  });

  it('管理员通过后商机上架并发送站内通知', async () => {
    const res = await apiPut(`/v1/admin/opportunities/${pendingOppId}/audit`, { action: 'approve' }, adminToken);
    assert.strictEqual(res.code, 0);

    // 商机变为可售
    const detail = await apiGet(`/opportunities/${pendingOppId}`);
    assert.strictEqual(detail.code, 0);
    assert.strictEqual(detail.data.status, 'active');
    assert.strictEqual(detail.data.auditStatus, 'approved');

    // 投稿人收到通知
    const notifs = await apiGet('/notifications', midToken);
    assert.strictEqual(notifs.code, 0);
    const list = notifs.data?.list || [];
    assert.ok(list.some((n) => (n.title || '').includes('审核通过')), '应收到审核通过通知');
  });

  it('重复审核被拒（非待审核状态）', async () => {
    const res = await apiPut(`/v1/admin/opportunities/${pendingOppId}/audit`, { action: 'approve' }, adminToken);
    assert.strictEqual(res.code, 400);
  });

  it('购买无折扣：实付 = 原价、discountRate = 1（统一原价，等级只影响分佣）', async () => {
    // 高信用分用户发布 30 积分商机，充值后按原价购买
    const buyRes = await apiPost('/orders', { opportunityId: pendingOppId }, highToken);
    // 余额可能不足，只验证不按折扣计算（若成功，实付应等于原价）
    if (buyRes.code === 0) {
      assert.strictEqual(buyRes.data.actualPrice, 30);
      assert.strictEqual(Number(buyRes.data.discountRate), 1, '购买应无折扣');
    } else {
      assert.strictEqual(buyRes.code, 422, '余额不足时应返回 422');
    }
  });

  it('注册赠送积极分带有效期（expires_at 非空），充值积极分永久（NULL）', async () => {
    const { default: pkg } = await import('mysql2/promise');
    const conn = await pkg.createConnection({
      host: '127.0.0.1', user: 'hof_user', password: 'hof_pass_2026', database: 'hotel_order_follow',
    });
    const [users] = await conn.query("SELECT id FROM users WHERE phone = '13700077001'");
    const userId = users[0].id;
    const [giftLogs] = await conn.query(
      "SELECT delta, expires_at FROM points_logs WHERE user_id = ? AND source_type = 'register_gift' ORDER BY id DESC LIMIT 1",
      [userId]
    );
    assert.ok(giftLogs.length > 0, '应有注册赠送记录');
    assert.ok(giftLogs[0].expires_at !== null, '注册赠送积分应带 expires_at');

    const [rechargeLogs] = await conn.query(
      "SELECT delta, expires_at FROM points_logs WHERE user_id = ? AND source_type = 'recharge' ORDER BY id DESC LIMIT 1",
      [userId]
    );
    if (rechargeLogs.length > 0) {
      assert.strictEqual(rechargeLogs[0].expires_at, null, '充值积分应永久（expires_at NULL）');
    }
    await conn.end();
  });

  it('登录打卡：登录后 user_login_days 记录当天登录', async () => {
    const { default: pkg } = await import('mysql2/promise');
    const conn = await pkg.createConnection({
      host: '127.0.0.1', user: 'hof_user', password: 'hof_pass_2026', database: 'hotel_order_follow',
    });
    const [users] = await conn.query("SELECT id FROM users WHERE phone = '13700077002'");
    const userId = users[0].id;
    const [rows] = await conn.query(
      'SELECT login_date FROM user_login_days WHERE user_id = ?',
      [userId]
    );
    assert.ok(rows.length > 0, '登录应记录 user_login_days');
    await conn.end();
  });

  it('会员等级配置返回分佣比例（commission_rate，管理员端）', async () => {
    const res = await apiGet('/v1/admin/levels', adminToken);
    assert.strictEqual(res.code, 0);
    const levels = res.data || [];
    assert.ok(levels.length >= 4);
    const normal = levels.find((l) => l.levelKey === 'normal' || l.level_key === 'normal');
    assert.ok(normal, '应包含 normal 等级');
    const rate = Number(normal.commissionRate ?? normal.commission_rate);
    assert.ok(rate > 0 && rate <= 1, `normal 分佣比例应位于 0~1，实际 ${rate}`);
  });
});
