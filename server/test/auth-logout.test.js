import { describe, it, before } from 'node:test';
import assert from 'node:assert';

const BASE = process.env.TEST_BASE || 'http://localhost:3001/api';
const PHONE = '13900004321';
const PASSWORD = 'logout1234';

async function userLogin() {
  const resp = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: PHONE, password: PASSWORD }),
  });
  const json = await resp.json();
  return { status: resp.status, token: json.data?.token || '', refreshToken: json.data?.refreshToken || '' };
}

async function userGet(path, token) {
  const resp = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return resp.status;
}

describe('服务端登出与 token 吊销', () => {
  before(async () => {
    // 幂等注册测试用户
    await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: PHONE, password: PASSWORD, nickname: '登出测试' }),
    });
  });

  it('用户登出后原 access token 立即失效（401）', async () => {
    const { token } = await userLogin();
    assert.ok(token, '登录失败');
    assert.strictEqual(await userGet('/points/balance', token), 200, '登出前应可用');

    const resp = await fetch(`${BASE}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await resp.json();
    assert.strictEqual(json.code, 0, '登出应成功');

    assert.strictEqual(await userGet('/points/balance', token), 401, '登出后原 token 应 401');
  });

  it('用户登出吊销 refreshToken，刷新接口拒绝', async () => {
    const { token, refreshToken } = await userLogin();
    assert.ok(token && refreshToken, '登录失败');
    await fetch(`${BASE}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const resp = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const json = await resp.json();
    assert.strictEqual(resp.status, 401, '已吊销的 refreshToken 不应换发新 token');
  });

  it('登出后新登录的 token 不受影响（按 jti 吊销，不影响其他会话）', async () => {
    const first = await userLogin();
    const second = await userLogin();
    assert.ok(first.token && second.token, '登录失败');
    await fetch(`${BASE}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${first.token}` } });
    assert.strictEqual(await userGet('/points/balance', first.token), 401, '第一个会话应失效');
    assert.strictEqual(await userGet('/points/balance', second.token), 200, '第二个会话应不受影响');
  });

  it('管理员登出后原 token 立即失效（401）', async () => {
    const loginResp = await fetch(`${BASE}/v1/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    const { token } = (await loginResp.json()).data || {};
    assert.ok(token, '管理员登录失败');

    const resp = await fetch(`${BASE}/v1/admin/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await resp.json();
    assert.strictEqual(json.code, 0, '管理员登出应成功');

    const me = await fetch(`${BASE}/v1/admin/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    assert.strictEqual(me.status, 401, '登出后原管理 token 应 401');
  });

  it('未登录调用登出返回 401', async () => {
    const resp = await fetch(`${BASE}/auth/logout`, { method: 'POST' });
    assert.strictEqual(resp.status, 401);
  });
});
