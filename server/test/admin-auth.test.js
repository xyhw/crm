import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

const BASE = 'http://127.0.0.1:3001/api';
const TMP_USERNAME = 'pwdtest_admin';
const PWD_BEFORE = 'before1234';
const PWD_AFTER = 'after12345';

async function login(username, password) {
  const resp = await fetch(`${BASE}/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const json = await resp.json();
  return json.data?.token || '';
}

async function changePassword(token, body) {
  const resp = await fetch(`${BASE}/v1/admin/auth/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return resp.json();
}

async function adminToken() {
  return login('admin', 'admin123');
}

describe('管理员修改自己密码', () => {
  let superToken;

  before(async () => {
    superToken = await adminToken();
    assert.ok(superToken, '超管登录失败');

    // 清理历史残留后创建临时管理员（独立于 seed 账号）
    const listRes = await fetch(`${BASE}/v1/admin/admins?keyword=${TMP_USERNAME}`, {
      headers: { Authorization: `Bearer ${superToken}` },
    }).then((r) => r.json());
    for (const row of listRes.data?.list || []) {
      if (row.username === TMP_USERNAME) {
        await fetch(`${BASE}/v1/admin/admins/${row.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${superToken}` },
        });
      }
    }
    const created = await fetch(`${BASE}/v1/admin/admins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superToken}` },
      body: JSON.stringify({ username: TMP_USERNAME, password: PWD_BEFORE, name: '改密测试号' }),
    }).then((r) => r.json());
    assert.strictEqual(created.code, 0, '临时管理员创建失败');
  });

  after(async () => {
    if (!superToken) return;
    const listRes = await fetch(`${BASE}/v1/admin/admins?keyword=${TMP_USERNAME}`, {
      headers: { Authorization: `Bearer ${superToken}` },
    }).then((r) => r.json());
    for (const row of listRes.data?.list || []) {
      if (row.username === TMP_USERNAME) {
        await fetch(`${BASE}/v1/admin/admins/${row.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${superToken}` },
        });
      }
    }
  });

  it('未带 token 拒绝', async () => {
    const resp = await fetch(`${BASE}/v1/admin/auth/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: 'x', newPassword: 'y' }),
    });
    assert.strictEqual(resp.status, 401);
  });

  it('参数校验：缺原密码', async () => {
    const token = await login(TMP_USERNAME, PWD_BEFORE);
    const res = await changePassword(token, { newPassword: 'whatever123' });
    assert.strictEqual(res.code, 400);
  });

  it('参数校验：新密码不足 8 位', async () => {
    const token = await login(TMP_USERNAME, PWD_BEFORE);
    const res = await changePassword(token, { oldPassword: PWD_BEFORE, newPassword: 'short' });
    assert.strictEqual(res.code, 400);
    assert.match(res.message, /8/);
  });

  it('原密码错误被拒绝', async () => {
    const token = await login(TMP_USERNAME, PWD_BEFORE);
    const res = await changePassword(token, { oldPassword: 'wrong9999', newPassword: 'whatever123' });
    assert.strictEqual(res.code, 400);
    assert.match(res.message, /原密码/);
  });

  it('新旧相同被拒绝', async () => {
    const token = await login(TMP_USERNAME, PWD_BEFORE);
    const res = await changePassword(token, { oldPassword: PWD_BEFORE, newPassword: PWD_BEFORE });
    assert.strictEqual(res.code, 400);
  });

  it('camelCase 修改成功后旧密码失效、新密码可登录', async () => {
    const token = await login(TMP_USERNAME, PWD_BEFORE);
    const res = await changePassword(token, { oldPassword: PWD_BEFORE, newPassword: PWD_AFTER });
    assert.strictEqual(res.code, 0);

    const oldLogin = await login(TMP_USERNAME, PWD_BEFORE);
    assert.strictEqual(oldLogin, '', '旧密码不应还能登录');
    const newToken = await login(TMP_USERNAME, PWD_AFTER);
    assert.ok(newToken, '新密码应能登录');

    // 换回原密码，保证幂等与 after 清理前账号状态稳定
    const revert = await changePassword(newToken, { oldPassword: PWD_AFTER, newPassword: PWD_BEFORE });
    assert.strictEqual(revert.code, 0);
  });

  it('snake_case 请求体同样生效', async () => {
    const token = await login(TMP_USERNAME, PWD_BEFORE);
    const res = await changePassword(token, { old_password: PWD_BEFORE, new_password: PWD_AFTER });
    assert.strictEqual(res.code, 0);
    const newToken = await login(TMP_USERNAME, PWD_AFTER);
    assert.ok(newToken);
    const revert = await changePassword(newToken, { old_password: PWD_AFTER, new_password: PWD_BEFORE });
    assert.strictEqual(revert.code, 0);
  });
});
