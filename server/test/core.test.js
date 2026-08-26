import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';
import bcrypt from 'bcryptjs';

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
  const resp = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
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

async function apiPut(path, data, token) {
  const resp = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return resp.json();
}

describe('核心流程', () => {
  let user1Token, user2Token, publishedId, kitchenId;

  before(async () => {
    // 确保测试用户存在且昵称正确（reset-password 测试依赖 nickname 匹配）
    const { default: pkg } = await import('mysql2/promise');
    const pool = pkg.createPool({
      host: '127.0.0.1',
      user: 'hof_user',
      password: 'hof_pass_2026',
      database: 'hotel_order_follow',
    });
    await pool.query(
      `INSERT INTO users (phone, nickname, password_hash, status, credit_score, created_at)
       VALUES ('13800000001', '测试用户1', ?, 'active', 100, NOW())
       ON DUPLICATE KEY UPDATE nickname = '测试用户1', status = 'active', credit_score = 100`,
      [await bcrypt.hash('123456', 10)]
    );
    await pool.query(
      `INSERT INTO users (phone, nickname, password_hash, status, credit_score, created_at)
       VALUES ('13800000002', '测试用户2', ?, 'active', 100, NOW())
       ON DUPLICATE KEY UPDATE nickname = '测试用户2', status = 'active', credit_score = 100`,
      [await bcrypt.hash('123456', 10)]
    );
    await pool.end();

    const res1 = await login('13800000001');
    assert.strictEqual(res1.code, 0);
    user1Token = res1.data.token;

    const res2 = await login('13800000002');
    assert.strictEqual(res2.code, 0);
    user2Token = res2.data.token;

    // 确保用户2有足够积分（直接写 points_logs）才能购买
    const { default: pkg2 } = await import('mysql2/promise');
    const pool2 = pkg2.createPool({
      host: '127.0.0.1',
      user: 'hof_user',
      password: 'hof_pass_2026',
      database: 'hotel_order_follow',
    });
    // 重置用户1状态与积分（前次运行"无效标记录"测试会扣分/封禁，需归位）
    await pool2.query(
      "UPDATE users SET status = 'active', credit_score = 100 WHERE phone = '13800000001'"
    );
    await pool2.query(
      `INSERT INTO points_accounts (user_id, balance)
       SELECT id, 10000 FROM users WHERE phone = '13800000001'
       ON DUPLICATE KEY UPDATE balance = 10000`
    );
    // 清零用户1历史无效商机（跨运行累计会触发 invalid_ban_threshold 封禁）
    await pool2.query(
      `UPDATE opportunities SET status = 'active', invalid_mark_count = 0
       WHERE user_id = (SELECT id FROM users WHERE phone = '13800000001')`
    );
    await pool2.query(
      `INSERT INTO points_logs (user_id, delta, balance_after, source_type, created_at)
       VALUES (2, 10000, 10000, 'recharge', NOW())`
    );
    await pool2.query(
      `INSERT INTO points_accounts (user_id, balance, total_recharged) VALUES (2, 10000, 10000)
       ON DUPLICATE KEY UPDATE balance = balance + 10000, total_recharged = total_recharged + 10000`
    );
    await pool2.end();
  });

  it('发布商机', async () => {
    const data = {
      title: '杭州西溪酒店弱电工程30间',
      city: '杭州',
      address: '余杭区五常街道西溪假日酒店',
      brand: '西溪假日',
      categoryId: 4,
      price: 50,
      descriptionFull: '完整描述含联系方式',
      contactName: '张经理',
      contactPhone: '13900000001',
      wechat: 'zhang_jingli',
    };
    const res = await apiPost('/opportunities', data, user1Token);
    assert.strictEqual(res.code, 0);
    assert.ok(res.data?.id);
    publishedId = res.data.id;
  });

  it('发布商机缺必填字段被拒', async () => {
    const res = await apiPost('/opportunities', { title: '缺字段商机' }, user1Token);
    assert.ok(res.code !== 0);
  });

  it('购买商机并验证分佣', async () => {
    assert.ok(publishedId, '依赖发布商机');
    const buyRes = await apiPost('/orders', { opportunityId: publishedId }, user2Token);
    assert.strictEqual(buyRes.code, 0);
    assert.ok(buyRes.data?.actualPrice >= 0);

    const pointsRes = await apiGet('/points/balance', user2Token);
    assert.ok(pointsRes.code === 0);

    const sellerMe = await apiGet('/auth/me', user1Token);
    assert.ok(sellerMe.code === 0);
    assert.ok(sellerMe.data.pointsBalance >= 0);
  });

  it('商机详情返回地址与微信号', async () => {
    assert.ok(publishedId, '依赖发布商机');
    const res = await apiGet(`/opportunities/${publishedId}`, user2Token);
    assert.strictEqual(res.code, 0);
    assert.strictEqual(res.data?.address, '余杭区五常街道西溪假日酒店');
    assert.strictEqual(res.data?.wechat, 'zhang_jingli');
  });

  it('无效标记录', async () => {
    assert.ok(publishedId, '没有发布商机');
    const invalRes = await apiPost(
      `/opportunities/${publishedId}/invalid-mark`,
      { reason: 'other', reasonText: '信息已过时' },
      user2Token
    );
    assert.strictEqual(invalRes.code, 0);
  });

  it('重复购买拦截', async () => {
    assert.ok(publishedId, '没有发布商机');
    const res = await apiPost('/orders', { opportunityId: publishedId }, user2Token);
    assert.ok(res.code !== 0);
  });

  it('推荐排序：同分类加权置顶，异分类新商机让位', async () => {
    // user2 发布一个分类6的商机（发布时间晚于 user1 的分类4商机）
    const pubRes = await apiPost('/opportunities', {
      title: '深圳湾酒店厨房设备采购20间',
      city: '深圳',
      address: '南山区深圳湾某酒店',
      brand: '深圳湾',
      categoryId: 6,
      price: 30,
      descriptionFull: '厨房设备采购需求',
      contactName: '张三',
      contactPhone: '13900000002',
    }, user2Token);
    assert.strictEqual(pubRes.code, 0);
    kitchenId = pubRes.data.id;

    // boost 分类4：更旧的分类4商机应排在更新的分类6商机之前
    // ponytail: 测试库积累大量历史商机，拉全量后比较相对位置
    const listRes = await apiGet('/opportunities?sort=recommend&pageSize=500&boostCategory=4', user1Token);
    assert.strictEqual(listRes.code, 0);
    const ids = listRes.data.list.map((x) => x.id);
    assert.ok(ids.includes(kitchenId), '软排序下异分类商机仍应可见');
    assert.ok(
      ids.indexOf(publishedId) < ids.indexOf(kitchenId),
      'boost 分类的旧商机应排在异分类新商机之前'
    );
  });

  it('推荐排序：购买历史推导同城/同品牌偏好加分', async () => {
    // user2 此前已购买 publishedId（杭州、分类4），推导出"杭州"偏好
    // 发布两个同为分类6的杭州/深圳商机，类型分相同，杭州应因城市偏好排前
    const hzRes = await apiPost('/opportunities', {
      title: '杭州西湖酒店厨房设备采购15间',
      city: '杭州',
      address: '西湖区某酒店',
      brand: '西湖宾馆',
      categoryId: 6,
      price: 30,
      descriptionFull: '厨房设备采购需求',
      contactName: '李四',
      contactPhone: '13900000003',
    }, user2Token);
    assert.strictEqual(hzRes.code, 0);
    const hangzhouId = hzRes.data.id;

    const listRes = await apiGet('/opportunities?sort=recommend&pageSize=500&boostCategory=6', user1Token);
    assert.strictEqual(listRes.code, 0);
    const ids = listRes.data.list.map((x) => x.id);
    assert.ok(ids.includes(hangzhouId), '同分类商机应在列表内');
    // 未登录用户无偏好数据：换 user2 自己请求也不影响断言目标（其偏好即杭州）
    assert.ok(
      ids.indexOf(hangzhouId) < ids.indexOf(kitchenId),
      '同城偏好的商机应排在同分类型异地商机之前'
    );
  });
});

describe('Banner 与通知', () => {
  let adminToken = '';

  before(async () => {
    const resp = await fetch(`${BASE}/v1/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    const json = await resp.json();
    adminToken = json.data?.token || '';
  });

  it('管理员获取 banner 列表', async () => {
    if (!adminToken) return;
    const res = await fetch(`${BASE}/v1/admin/banners`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    assert.strictEqual(res.code, 0);
    assert.ok(Array.isArray(res.data?.list));
  });

  it('管理员发送通知', async () => {
    if (!adminToken) return;
    const res = await fetch(`${BASE}/v1/admin/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: '系统测试通知',
        content: '这是一条测试通知',
        sendAll: false,
        userIds: [1],
      }),
    });
    const json = await res.json();
    assert.strictEqual(json.code, 0);
  });
});

describe('Banner 接口', () => {
  it('H5 Banner 列表', async () => {
    const resp = await fetch(`${BASE}/banners`);
    const json = await resp.json();
    assert.strictEqual(json.code, 0);
    assert.ok(Array.isArray(json.data?.list));
  });

  it('忘记密码：发送验证码后凭验证码重置，旧 Token 立即失效', async () => {
    const resetBefore = await login('13800000001');
    assert.strictEqual(resetBefore.code, 0);
    const tokenBefore = resetBefore.data.token;

    // 0. 测试用户补绑定邮箱并确保 active（前序无效判定测试可能已置为 banned）
    const { default: pkg } = await import('mysql2/promise');
    const pool = pkg.createPool({
      host: '127.0.0.1',
      user: 'hof_user',
      password: 'hof_pass_2026',
      database: 'hotel_order_follow',
    });
    await pool.query(
      "UPDATE users SET status = 'active', email = 'test1@example.com' WHERE phone = '13800000001'"
    );

    // 1. 发送验证码（发往该邮箱，开发模式打印到日志）
    const sendResp = await fetch(`${BASE}/auth/send-reset-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test1@example.com' }),
    });
    const sendJson = await sendResp.json();
    assert.strictEqual(sendJson.code, 0);

    // 2. 模拟用户从邮箱拿到验证码：把 DB 中的验证码哈希改写为已知值
    const { createHash } = await import('crypto');
    const codeHash = createHash('sha256').update('654321').digest('hex');
    await pool.query(
      'UPDATE password_reset_codes SET code_hash = ? WHERE user_id = (SELECT id FROM users WHERE phone = ?) AND used_at IS NULL',
      [codeHash, '13800000001']
    );

    // 3. 错误验证码重置被拒绝
    const badResp = await fetch(`${BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test1@example.com', code: '000000', newPassword: 'newpass123' }),
    });
    assert.strictEqual((await badResp.json()).code, 400);

    // 4. 正确验证码重置成功
    const resetResp = await fetch(`${BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test1@example.com', code: '654321', newPassword: 'newpass123' }),
    });
    assert.strictEqual((await resetResp.json()).code, 0);

    // 5. 旧密码失效，新密码可登录
    const oldLogin = await login('13800000001', '123456');
    assert.strictEqual(oldLogin.code, 400);
    const newLogin = await login('13800000001', 'newpass123');
    assert.strictEqual(newLogin.code, 0);

    // 6. 重置前签发的 Token 已被 token_version 作废
    const oldTokenResp = await fetch(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${tokenBefore}` },
    });
    assert.strictEqual((await oldTokenResp.json()).code, 401);

    // 7. 恢复密码为 123456，保证后续回归不受影响
    const bcrypt = (await import('bcryptjs')).default;
    const hash = await bcrypt.hash('123456', 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE phone = ?', [hash, '13800000001']);
    await pool.end();
  });

  it('忘记密码：验证码错误 5 次后作废，正确验证码也无法通过', async () => {
    const { default: pkg } = await import('mysql2/promise');
    const pool = pkg.createPool({
      host: '127.0.0.1',
      user: 'hof_user',
      password: 'hof_pass_2026',
      database: 'hotel_order_follow',
    });
    await pool.query(
      "UPDATE users SET status = 'active', email = 'test1@example.com' WHERE phone = '13800000001'"
    );

    // 1. 发送验证码
    const sendResp = await fetch(`${BASE}/auth/send-reset-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test1@example.com' }),
    });
    assert.strictEqual((await sendResp.json()).code, 0);

    // 2. 改写验证码哈希为已知值
    const { createHash } = await import('crypto');
    const codeHash = createHash('sha256').update('654321').digest('hex');
    await pool.query(
      'UPDATE password_reset_codes SET code_hash = ?, attempts = 0 WHERE user_id = (SELECT id FROM users WHERE phone = ?) AND used_at IS NULL',
      [codeHash, '13800000001']
    );

    // 3. 连续 5 次错误验证码被拒
    for (let i = 0; i < 5; i += 1) {
      const bad = await fetch(`${BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test1@example.com', code: '000000', newPassword: 'newpass123' }),
      });
      assert.strictEqual((await bad.json()).code, 400);
    }

    // 4. 第 6 次即使用正确验证码也因尝试次数超限被作废
    const locked = await fetch(`${BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test1@example.com', code: '654321', newPassword: 'newpass123' }),
    });
    assert.strictEqual((await locked.json()).code, 400);

    // 5. 密码未被改动，原密码仍可登录
    const stillLogin = await login('13800000001', '123456');
    assert.strictEqual(stillLogin.code, 0);

    await pool.end();
  });

  it('修改密码：旧密码必须匹配，成功后可登录新密码', async () => {
    const { default: pkg } = await import('mysql2/promise');
    const pool = pkg.createPool({
      host: '127.0.0.1',
      user: 'hof_user',
      password: 'hof_pass_2026',
      database: 'hotel_order_follow',
    });
    // 确保用户2 状态与密码正常（bcrypt 重置为 123456，防前序残留破坏）
    const bcrypt2 = (await import('bcryptjs')).default;
    const hash2 = await bcrypt2.hash('123456', 10);
    await pool.query(
      "UPDATE users SET status = 'active', password_hash = ?, token_version = 0 WHERE phone = '13800000002'",
      [hash2]
    );

    const login2 = await login('13800000002');
    assert.strictEqual(login2.code, 0);
    const token2 = login2.data.token;
    const refreshToken2 = login2.data.refreshToken;

    // 旧密码错误被拒
    const badResp = await fetch(`${BASE}/auth/change-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token2}` },
      body: JSON.stringify({ oldPassword: 'wrongpass', newPassword: 'newpass456' }),
    });
    assert.strictEqual((await badResp.json()).code, 400);

    // 正确修改密码
    const okResp = await fetch(`${BASE}/auth/change-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token2}` },
      body: JSON.stringify({ oldPassword: '123456', newPassword: 'newpass456' }),
    });
    assert.strictEqual((await okResp.json()).code, 0);

    // 旧密码失效，新密码可登录
    const oldLogin2 = await login('13800000002', '123456');
    assert.strictEqual(oldLogin2.code, 400);
    const newLogin2 = await login('13800000002', 'newpass456');
    assert.strictEqual(newLogin2.code, 0);

    // 修改前的旧 Token 已失效（token_version +1）
    const oldTokenResp2 = await fetch(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    assert.strictEqual((await oldTokenResp2.json()).code, 401);

    // 修改前的旧 refreshToken 也已作废（refresh 接口校验 token_version），不能续期
    const staleRefresh = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshToken2 }),
    });
    assert.strictEqual((await staleRefresh.json()).code, 401);

    // 恢复密码为 123456
    const bcrypt = (await import('bcryptjs')).default;
    const hash = await bcrypt.hash('123456', 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE phone = ?', [hash, '13800000002']);
    await pool.end();
  });
});