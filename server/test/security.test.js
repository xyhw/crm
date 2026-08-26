import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

const BASE = 'http://127.0.0.1:3001/api';

async function login(phone, password = '123456') {
  const resp = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  return resp.json();
}

// 独立的测试账号，避免与 core/payment 等并行文件共用 13800000001/02 造成锁定互相干扰
const LOCK_PHONE = '13800000021';

async function getUserIdByPhone(pool, phone) {
  const [rows] = await pool.query('SELECT id FROM users WHERE phone = ?', [phone]);
  return rows[0]?.id || 0;
}

// 清理锁定环境：删除该账号失败记录，保证可重复运行
async function clearFailures() {
  const { default: pkg } = await import('mysql2/promise');
  const pool = pkg.createPool({
    host: '127.0.0.1',
    user: 'hof_user',
    password: 'hof_pass_2026',
    database: 'hotel_order_follow',
  });
  const uid = await getUserIdByPhone(pool, LOCK_PHONE);
  if (uid) await pool.query('DELETE FROM login_failures WHERE user_id = ?', [uid]);
  return pool;
}

describe('安全加固', () => {
  before(async () => {
    const pool = await clearFailures();
    await pool.query(
      "UPDATE users SET status = 'active' WHERE phone = ?",
      [LOCK_PHONE]
    );
    await pool.end();
  });

  after(async () => {
    const pool = await clearFailures();
    await pool.end();
  });

  it('账号级锁定：同一账号连续 5 次失败后，第 6 次被锁定（含正确密码）', async () => {
    // 连续 5 次错误密码 -> 均返回 400（密码错误）
    for (let i = 0; i < 5; i += 1) {
      const resp = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: LOCK_PHONE, password: `wrong${i}` }),
      });
      assert.strictEqual((await resp.json()).code, 400);
    }

    // 第 6 次：错误密码 -> 429 锁定
    const lockedResp = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: LOCK_PHONE, password: 'wrong6' }),
    });
    assert.strictEqual((await lockedResp.json()).code, 429);

    // 即使密码正确，锁定期内也拒绝
    const correctWhileLocked = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: LOCK_PHONE, password: '123456' }),
    });
    assert.strictEqual((await correctWhileLocked.json()).code, 429);

    // 清理锁定后，正确密码可登录
    const pool = await clearFailures();
    const okResp = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: LOCK_PHONE, password: '123456' }),
    });
    const okJson = await okResp.json();
    assert.strictEqual(okJson.code, 0);
    await pool.end();
  });

  it('密码策略：注册/重置/修改均拒绝 8 位以下无字母数字的弱密码', async () => {
    // 注册弱密码
    const regResp = await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13700009999', nickname: '策略测试', password: '123456' }),
    });
    const regJson = await regResp.json();
    assert.strictEqual(regJson.code, 400);
    assert.ok(regJson.message.includes('字母和数字'));

    // 修改密码弱密码（先正常登录）
    const loginRes = await login(LOCK_PHONE, '123456');
    assert.strictEqual(loginRes.code, 0);
    const chgResp = await fetch(`${BASE}/auth/change-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${loginRes.data.token}` },
      body: JSON.stringify({ oldPassword: '123456', newPassword: 'abc123' }),
    });
    const chgJson = await chgResp.json();
    assert.strictEqual(chgJson.code, 400);
    assert.ok(chgJson.message.includes('字母和数字'));
  });

  it('防枚举：未注册邮箱发送验证码返回统一成功文案，重置返回统一失败文案', async () => {
    // 未注册邮箱 send-reset-code -> 仍返回成功（不泄露是否注册）
    const sendResp = await fetch(`${BASE}/auth/send-reset-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@nonexistent-test.com' }),
    });
    const sendJson = await sendResp.json();
    assert.strictEqual(sendJson.code, 0);

    // 未注册邮箱 reset-password -> 返回「验证码无效或已过期」（与验证码错误一致，不区分）
    const resetResp = await fetch(`${BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@nonexistent-test.com', code: '000000', newPassword: 'newpass123' }),
    });
    const resetJson = await resetResp.json();
    assert.strictEqual(resetJson.code, 400);
    assert.strictEqual(resetJson.message, '验证码无效或已过期');
  });

  it('魔数校验：真实类型通过，伪造扩展名被拒', async () => {
    const { validateFileMagic } = await import('../services/file-magic.js');

    // 真 JPEG 头
    assert.ok(validateFileMagic(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), '.jpg'));
    // 真 PNG 头
    assert.ok(validateFileMagic(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]), '.png'));
    // 真 WEBP（RIFF....WEBP）
    assert.ok(validateFileMagic(Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]), '.webp'));
    // HTML 内容伪装 jpg -> 拒绝
    assert.ok(!validateFileMagic(Buffer.from('<html><script>alert(1)</script></html>'), '.jpg'));
    // ZIP 头（OOXML 容器）-> docx 通过
    assert.ok(validateFileMagic(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]), '.docx'));
  });
});