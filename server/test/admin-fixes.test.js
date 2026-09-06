import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

// 审计修复回归：P0-2 导入归属 / P0-3 封禁 / P0-4 统计 / P0-5 过期豁免 / P1-3 count / P1-4 审核留痕
const BASE = 'http://localhost:3001/api';
const PHONE = '19910002201';
const PWD = 'auditReg123';

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
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return resp.json();
}

async function apiGet(path, token) {
  const resp = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return resp.json();
}

async function pool() {
  const { default: pkg } = await import('mysql2/promise');
  return pkg.createPool({
    host: '127.0.0.1',
    user: 'hof_user',
    password: 'hof_pass_2026',
    database: 'hotel_order_follow',
  });
}

describe('审计修复回归（stats/封禁/count/审核留痕/过期豁免/抽成配置）', () => {
  let adminToken;
  let superAdminId;
  let userToken;
  let userId;
  let p;

  before(async () => {
    const login = await apiPost('/v1/admin/auth/login', { username: 'admin', password: 'admin123' });
    adminToken = login.data?.token;
    assert.ok(adminToken, '超管登录失败');

    await apiPost('/auth/register', { phone: PHONE, password: PWD, nickname: '审计回归号' });
    const userLogin = await apiPost('/auth/login', { phone: PHONE, password: PWD });
    assert.strictEqual(userLogin.code, 0, '测试用户登录失败');
    userToken = userLogin.data.token;

    p = await pool();
    const [rows] = await p.query('SELECT id FROM users WHERE phone = ?', [PHONE]);
    userId = rows[0].id;
    const [adminRows] = await p.query("SELECT id FROM admin_users WHERE username = 'admin'");
    superAdminId = adminRows[0].id;
    await p.query('UPDATE users SET status = "active" WHERE id = ?', [userId]);
  });

  after(async () => {
    if (!p) return;
    await p.query('DELETE FROM opportunities WHERE user_id = ? AND title IN (?, ?)', [userId, '回归统计商机', '回归抽成商机']);
    await p.query('DELETE FROM points_logs WHERE user_id = ? AND source_title IN (?, ?)', [userId, '回归过期奖励', '回归充值永久']);
    await p.query('DELETE FROM points_logs WHERE user_id = ? AND source_title = ?', [userId, '积分过期']);
    await p.query('DELETE FROM points_accounts WHERE user_id = ?', [userId]);
    await p.end();
    // 动态 import 的 scheduler/level.service 会在测试进程内开启 db.js 私有连接池，须显式关闭
    const { closePool } = await import('../db.js');
    await closePool();
  });

  // ---------- P0-4 ----------
  it('stats/me 发布统计不再恒为 0', async () => {
    await p.query(
      `INSERT INTO opportunities (user_id, title, category_id, city, price, status)
       VALUES (?, '回归统计商机', 1, '杭州', 50, 'active')`,
      [userId]
    );
    const res = await apiGet('/stats/me', userToken);
    assert.strictEqual(res.code, 0);
    assert.ok(res.data.published >= 1, `published 应 >=1，实际 ${res.data.published}`);
    assert.ok(typeof res.data.crm === 'number');
  });

  // ---------- P0-3 ----------
  it('PUT /users/:id 支持封禁与解封，非法枚举拒绝', async () => {
    const ban = await apiPut(`/v1/admin/users/${userId}`, { status: 'banned' }, adminToken);
    assert.strictEqual(ban.code, 0);
    const [row] = await p.query('SELECT status FROM users WHERE id = ?', [userId]);
    assert.strictEqual(row[0].status, 'banned');

    const bannedLogin = await apiPost('/auth/login', { phone: PHONE, password: PWD });
    assert.notStrictEqual(bannedLogin.code, 0, '封禁用户不应能登录');

    const bad = await apiPut(`/v1/admin/users/${userId}`, { status: 'deleted' }, adminToken);
    assert.strictEqual(bad.code, 400);

    const unban = await apiPut(`/v1/admin/users/${userId}`, { status: 'active' }, adminToken);
    assert.strictEqual(unban.code, 0);
    const [row2] = await p.query('SELECT status FROM users WHERE id = ?', [userId]);
    assert.strictEqual(row2[0].status, 'active');
  });

  // ---------- P1-3 ----------
  it('用户列表 total 跟随筛选条件', async () => {
    await apiPut(`/v1/admin/users/${userId}`, { status: 'banned' }, adminToken);
    const filtered = await apiGet('/v1/admin/users?status=banned&pageSize=1', adminToken);
    const [allRows] = await p.query(
      'SELECT (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND status="banned") banned, (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) allCount'
    );
    assert.strictEqual(Number(filtered.data.total), Number(allRows[0].banned));

    const all = await apiGet('/v1/admin/users?pageSize=1', adminToken);
    assert.strictEqual(Number(all.data.total), Number(allRows[0].allCount));
    assert.ok(Number(all.data.total) >= Number(filtered.data.total));

    await apiPut(`/v1/admin/users/${userId}`, { status: 'active' }, adminToken);
  });

  // ---------- P1-4 + 审核列表 all ----------
  it('审核写 audit_admin_id 且 all 状态可查', async () => {
    const listAll = await apiGet('/v1/admin/audit/follow-up-shares?status=', adminToken);
    assert.strictEqual(listAll.code, 0);
    assert.ok(listAll.data.list.length > 0, 'status 为空应返回全部审核记录');

    const [orig] = await p.query('SELECT id, audit_status, audit_reason, audit_admin_id FROM follow_up_shares ORDER BY id LIMIT 1');
    if (!orig[0]) return; // 无数据时跳过写留痕断言
    await p.query("UPDATE follow_up_shares SET audit_status='pending' WHERE id = ?", [orig[0].id]);

    const res = await apiPut(`/v1/admin/audit/follow-up-shares/${orig[0].id}`, { status: 'rejected', reason: '回归测试驳回原因' }, adminToken);
    assert.strictEqual(res.code, 0);
    const [afterRow] = await p.query('SELECT audit_status, audit_reason, audit_admin_id FROM follow_up_shares WHERE id = ?', [orig[0].id]);
    assert.strictEqual(afterRow[0].audit_status, 'rejected');
    assert.strictEqual(afterRow[0].audit_reason, '回归测试驳回原因');
    assert.strictEqual(Number(afterRow[0].audit_admin_id), Number(superAdminId));

    await p.query('UPDATE follow_up_shares SET audit_status=?, audit_reason=?, audit_admin_id=? WHERE id = ?', [
      orig[0].audit_status, orig[0].audit_reason, orig[0].audit_admin_id, orig[0].id,
    ]);
  });

  // ---------- P0-5 ----------
  it('过期清理豁免充值与退款来源', async () => {
    await p.query(
      `INSERT INTO points_accounts (user_id, balance, total_recharged) VALUES (?, 1000, 500)
       ON DUPLICATE KEY UPDATE balance = 1000`,
      [userId]
    );
    const base = `INSERT INTO points_logs (user_id, delta, balance_after, source_type, source_title, created_at)
                  VALUES (?, 50, 1000, ?, ?, DATE_SUB(NOW(), INTERVAL 400 DAY))`;
    await p.query(base, [userId, 'reward', '回归过期奖励']);
    await p.query(base, [userId, 'recharge', '回归充值永久']);

    const { default: scheduler } = await import('../scheduler.js');
    await scheduler.cleanExpiredPoints();

    const [logs] = await p.query(
      'SELECT source_type, expires_at FROM points_logs WHERE user_id = ? AND source_title IN (?, ?)',
      [userId, '回归过期奖励', '回归充值永久']
    );
    const reward = logs.find((l) => l.source_type === 'reward');
    const recharge = logs.find((l) => l.source_type === 'recharge');
    assert.ok(reward.expires_at, '奖励积分应被过期');
    assert.strictEqual(recharge.expires_at, null, '充值积分必须永久有效（规格 5.2）');
  });

  // ---------- P0-1（方案 B：定价制分佣） ----------
  it('卖家到手由定价与等级分佣率决定，与买家折扣解耦', async () => {
    const [oppRows] = await p.query(
      `INSERT INTO opportunities (user_id, title, category_id, city, price, status) VALUES (?, '回归分佣商机B', 1, '杭州', 100, 'active')`,
      [userId]
    );
    const {
      getPurchasePrice, calculateSellerEarnings, getSellerCommissionRate,
      calculatePurchaseDiscount, clearLevelConfigCache, getUserLevel,
    } = await import('../services/level.service.js');
    const oppId = oppRows.insertId;

    // 两档默认参数：普通 1.00/0.76、高级 0.85/0.80，且折扣不得低于任一分佣率
    const [levels] = await p.query('SELECT level_key, purchase_discount, seller_commission_rate FROM member_levels ORDER BY sort_order');
    assert.strictEqual(levels.length, 2, '等级应为两档');
    const keys = levels.map((l) => l.level_key).sort();
    assert.deepStrictEqual(keys, ['normal', 'premium']);
    for (const l of levels) {
      assert.ok(Number(l.purchase_discount) >= Number(l.seller_commission_rate), `${l.level_key} 折扣不得低于分佣率`);
    }

    const rate = await getSellerCommissionRate(userId);
    const discount = await calculatePurchaseDiscount(userId);
    const earnings = await calculateSellerEarnings(userId, 100, Math.round(100 * discount));
    assert.strictEqual(earnings.sellerEarnings, Math.round(100 * rate), '卖家到手 = 定价 × 分佣率');

    // 定价制核心：买家等级折扣变化不改变卖家到手
    const other = await calculateSellerEarnings(userId, 100, 85);
    assert.strictEqual(other.sellerEarnings, earnings.sellerEarnings, '卖家收益与买家实付解耦');
    assert.strictEqual(other.platformFee, 85 - other.sellerEarnings, '平台留存 = 买家实付 − 卖家到手');

    // 修改等级分佣率即时生效
    const levelKey = await getUserLevel(userId);
    await p.query('UPDATE member_levels SET seller_commission_rate = 0.70 WHERE level_key = ?', [levelKey]);
    clearLevelConfigCache();
    const bumped = await calculateSellerEarnings(userId, 100, Math.round(100 * discount));
    assert.strictEqual(bumped.sellerEarnings, 70, '改分佣率后即时生效');
    await p.query('UPDATE member_levels SET seller_commission_rate = ? WHERE level_key = ?', [rate, levelKey]);
    clearLevelConfigCache();

    const price = await getPurchasePrice(oppId, userId);
    assert.strictEqual(price.finalPrice, Math.round(100 * discount), '买家按折扣价支付');
    assert.strictEqual(price.sellerIncome, Math.round(100 * rate), '预览的卖家收入与成交口径一致');
    assert.strictEqual(price.platformFee, price.finalPrice - price.sellerIncome);
  });
});
