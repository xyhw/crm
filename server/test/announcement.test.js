import { describe, it, before, after } from 'node:test';
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

async function userLogin(phone, password = '123456') {
  const resp = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  const json = await resp.json();
  return json.data?.token || '';
}

describe('公告栏 Announcement', () => {
  let adminToken = '';
  let userToken = '';
  let createdId = null;
  let expiredId = null;
  const stamp = Date.now();

  before(async () => {
    adminToken = await adminLogin();
    userToken = await userLogin('13800000001');
  });

  it('管理员创建公告（标题+正文）', async () => {
    assert.ok(adminToken, 'admin token should exist');
    const res = await fetch(`${BASE}/v1/admin/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ title: `测试公告-${stamp}`, content: '系统将于周六维护' }),
    });
    const json = await res.json();
    assert.strictEqual(json.code, 0);
    assert.ok(json.data?.id);
    createdId = json.data.id;
  });

  it('管理员创建图片公告（media_type=image）', async () => {
    const res = await fetch(`${BASE}/v1/admin/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ title: `图片公告-${stamp}`, mediaUrl: 'https://example.com/a.png' }),
    });
    const json = await res.json();
    assert.strictEqual(json.code, 0);
    assert.ok(json.data?.id);
  });

  it('管理员创建已过期公告', async () => {
    const past = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const res = await fetch(`${BASE}/v1/admin/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ title: `过期公告-${stamp}`, content: '已过期', endAt: past }),
    });
    const json = await res.json();
    assert.strictEqual(json.code, 0);
    expiredId = json.data.id;
  });

  it('创建公告时标题为空被拒绝', async () => {
    const res = await fetch(`${BASE}/v1/admin/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ title: '', content: '正文' }),
    });
    const json = await res.json();
    assert.strictEqual(json.code, 400);
  });

  it('用户端公告列表包含有效公告且不包含过期公告', async () => {
    const res = await fetch(`${BASE}/announcements`, {
      headers: { Authorization: `Bearer ${userToken}` },
    }).then((r) => r.json());
    assert.strictEqual(res.code, 0);
    const titles = (res.data?.list || []).map((a) => a.title);
    assert.ok(titles.includes(`测试公告-${stamp}`));
    assert.ok(titles.includes(`图片公告-${stamp}`));
    assert.ok(!titles.includes(`过期公告-${stamp}`));
  });

  it('用户端公告详情可查看', async () => {
    assert.ok(createdId);
    const res = await fetch(`${BASE}/announcements/${createdId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    }).then((r) => r.json());
    assert.strictEqual(res.code, 0);
    assert.strictEqual(res.data.title, `测试公告-${stamp}`);
  });

  it('管理员更新公告后内容变更', async () => {
    assert.ok(createdId);
    const res = await fetch(`${BASE}/v1/admin/announcements/${createdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ content: '更新后的内容', isTop: true }),
    });
    const json = await res.json();
    assert.strictEqual(json.code, 0);

    const detail = await fetch(`${BASE}/v1/admin/announcements/${createdId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    assert.strictEqual(detail.data.content, '更新后的内容');
    assert.strictEqual(detail.data.is_top, 1);
  });

  it('管理员下线公告后用户端不再可见', async () => {
    assert.ok(createdId);
    await fetch(`${BASE}/v1/admin/announcements/${createdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'inactive' }),
    });
    const res = await fetch(`${BASE}/announcements`, {
      headers: { Authorization: `Bearer ${userToken}` },
    }).then((r) => r.json());
    const titles = (res.data?.list || []).map((a) => a.title);
    assert.ok(!titles.includes(`测试公告-${stamp}`));
  });

  it('管理员删除公告', async () => {
    assert.ok(createdId);
    const res = await fetch(`${BASE}/v1/admin/announcements/${createdId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    assert.strictEqual(res.code, 0);
    const detail = await fetch(`${BASE}/v1/admin/announcements/${createdId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    assert.strictEqual(detail.code, 404);
  });

  after(async () => {
    // 清理测试数据（幂等）
    if (adminToken) {
      await fetch(`${BASE}/v1/admin/announcements/${createdId || 0}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      }).catch(() => {});
      await fetch(`${BASE}/v1/admin/announcements/${expiredId || 0}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      }).catch(() => {});
    }
  });
});
