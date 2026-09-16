import { describe, it, before } from 'node:test';
import assert from 'node:assert';

const BASE = process.env.TEST_BASE || 'http://localhost:3001/api';

async function adminLogin(username = 'admin', password = 'admin123') {
  const resp = await fetch(`${BASE}/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const json = await resp.json();
  return { status: resp.status, token: json.data?.token || '', message: json.message };
}

async function adminGet(path, token) {
  const resp = await fetch(`${BASE}/v1/admin${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return resp.json();
}

const FIN_USER = 'rbac_fin_tester';

describe('后台 RBAC 角色授权（requireRole）与角色权限种子', () => {
  let superToken;
  let finToken;

  before(async () => {
    const admin = await adminLogin();
    superToken = admin.token;
    assert.ok(superToken, '超级管理员登录失败');

    // 幂等创建一个财务角色管理员用于越权校验；已存在则重绑角色（自愈历史无角色账号）
    const createResp = await fetch(`${BASE}/v1/admin/admins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superToken}` },
      body: JSON.stringify({
        username: FIN_USER,
        password: 'rbacfin123',
        name: 'RBAC财务测试',
        roleIds: [3],
      }),
    });
    const createJson = await createResp.json();
    if (createJson.code === 409 || createJson.code === 400) {
      const list = await adminGet(`/admins?keyword=${FIN_USER}`, superToken);
      const existing = (list.data?.list || []).find((a) => a.username === FIN_USER);
      if (existing) {
        await fetch(`${BASE}/v1/admin/admins/${existing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superToken}` },
          body: JSON.stringify({ roleIds: [3] }),
        });
      }
    }
    const fin = await adminLogin(FIN_USER, 'rbacfin123');
    finToken = fin.token;
    assert.ok(finToken, '财务管理员登录失败');
  });

  it('财务可以访问订单/积分/对账（FIN 组）', async () => {
    const orders = await adminGet('/orders?pageSize=5', finToken);
    assert.strictEqual(orders.code, 0, '财务访问订单应放行');
    const points = await adminGet('/points?pageSize=5', finToken);
    assert.strictEqual(points.code, 0, '财务访问积分应放行');
    const recharge = await adminGet('/recharge-orders?pageSize=5', finToken);
    assert.strictEqual(recharge.code, 0, '财务访问充值对账应放行');
  });

  it('财务访问超管专属接口返回 403 权限不足', async () => {
    for (const path of ['/configs', '/levels', '/roles', '/admins', '/audit-logs']) {
      const res = await adminGet(path, finToken);
      assert.strictEqual(res.code, 403, `${path} 应拒绝财务角色`);
    }
  });

  it('财务访问运营专属接口返回 403 权限不足', async () => {
    for (const path of ['/opportunities', '/users', '/banners', '/announcements']) {
      const res = await adminGet(path, finToken);
      assert.strictEqual(res.code, 403, `${path} 应拒绝财务角色`);
    }
  });

  it('超管可访问全部接口', async () => {
    for (const path of ['/configs', '/roles', '/opportunities?pageSize=5', '/points?pageSize=5', '/stats/dashboard']) {
      const res = await adminGet(path, superToken);
      assert.strictEqual(res.code, 0, `超管访问 ${path} 应放行`);
    }
  });

  it('默认角色的 role_permissions 已种子化（与 requireRole 映射对齐）', async () => {
    const res = await adminGet('/roles', superToken);
    assert.strictEqual(res.code, 0);
    const roles = res.data || [];
    const byName = Object.fromEntries(roles.map((r) => [r.name, r.permissions || []]));

    assert.ok(byName.super_admin.length >= 23, '超管应拥有全部权限点');
    assert.ok(byName.operation.length >= 12, '运营应有商机/用户/审核等权限点');
    assert.ok(byName.finance.length >= 3, '财务应有订单/积分权限点');
    assert.ok(byName.support.length >= 1, '客服应至少有仪表盘权限点');

    // 关键权限点归属校验
    assert.ok(byName.operation.includes('opportunities'), '运营含商机管理');
    assert.ok(byName.operation.includes('users.points'), '运营含调整积分');
    assert.ok(byName.finance.includes('orders'), '财务含订单管理');
    assert.ok(byName.finance.includes('points'), '财务含积分管理');
    assert.ok(!byName.finance.includes('configs'), '财务不含系统配置');
    assert.ok(!byName.support.includes('configs'), '客服不含系统配置');
  });
});
