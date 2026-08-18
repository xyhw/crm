import { describe, it, before } from 'node:test';
import assert from 'node:assert';

const BASE = 'http://localhost:3001/api';

const FOLLOW_UP_STATUSES = ['call_no_answer', 'added_wechat', 'interested', 'quoting', 'negotiating', 'closed', 'abandoned'];

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

// 注册（已存在则忽略，返回 null）
async function registerIfAbsent(phone, extra = {}) {
  const res = await apiPost('/auth/register', { phone, password: '123456', nickname: `T${phone.slice(-4)}`, ...extra });
  if (res.code !== 0 && res.code !== 400) {
    throw new Error(`register failed: ${JSON.stringify(res)}`);
  }
  return res;
}

describe('P1 关键能力', () => {
  let userAToken, userBToken, publishedId, crmId;

  before(async () => {
    // 用户A：注册（带 email）
    const phoneA = '13700009901';
    const regA = await registerIfAbsent(phoneA, { email: 'a@example.com', company: 'A公司', category: 'zhuangxiu' });
    const loginA = regA.code === 0 ? regA : await apiPost('/auth/login', { phone: phoneA, password: '123456' });
    userAToken = loginA.data.token;

    // 用户B：注册 + 充值
    const phoneB = '13700009902';
    const regB = await registerIfAbsent(phoneB);
    const loginB = regB.code === 0 ? regB : await apiPost('/auth/login', { phone: phoneB, password: '123456' });
    userBToken = loginB.data.token;

    const { default: pkg } = await import('mysql2/promise');
    const pool = pkg.createPool({
      host: '127.0.0.1',
      user: 'hof_user',
      password: 'hof_pass_2026',
      database: 'hotel_order_follow',
    });
    const [userBRow] = await pool.query('SELECT id FROM users WHERE phone = ?', [phoneB]);
    const userBId = userBRow[0].id;
    await pool.query(
      'INSERT INTO points_accounts (user_id, balance, total_recharged) VALUES (?, 5000, 5000) ON DUPLICATE KEY UPDATE balance = balance + 5000, total_recharged = total_recharged + 5000',
      [userBId]
    );
    await pool.end();
  });

  it('注册接口携带 email/company/category 并入库', async () => {
    const me = await apiGet('/auth/me', userAToken);
    assert.strictEqual(me.code, 0);
    assert.strictEqual(me.data.email, 'a@example.com');
    assert.strictEqual(me.data.company, 'A公司');
    assert.strictEqual(me.data.category, 'zhuangxiu');
  });

  it('发布商机携带 brand/attachments/stage/tags', async () => {
    const res = await apiPost('/opportunities', {
      title: 'P1测试-某酒店软装项目',
      categoryId: 3,
      brand: '测试酒店品牌',
      city: '北京',
      descriptionPublic: '公开简介',
      contactName: '王经理',
      contactPhone: '13711112222',
      stage: 'design',
      price: 30,
      tags: ['软装'],
      attachments: ['/uploads/test-1.png', '/uploads/test-2.pdf'],
    }, userAToken);
    assert.strictEqual(res.code, 0);
    publishedId = res.data.id;
  });

  it('发布者视角详情返回 brand 与 attachments', async () => {
    const detail = await apiGet(`/opportunities/${publishedId}`, userAToken);
    assert.strictEqual(detail.code, 0);
    assert.strictEqual(detail.data.brand, '测试酒店品牌');
    assert.deepStrictEqual(detail.data.attachments, ['/uploads/test-1.png', '/uploads/test-2.pdf']);
    assert.strictEqual(detail.data.isPublisher, true);
  });

  it('匿名视角详情不泄露联系方式、地址、项目现状与附件', async () => {
    const detail = await apiGet(`/opportunities/${publishedId}`);
    assert.strictEqual(detail.code, 0);
    assert.strictEqual(detail.data.contactName, undefined);
    assert.strictEqual(detail.data.contactPhone, undefined);
    assert.strictEqual(detail.data.wechat, undefined);
    assert.strictEqual(detail.data.address, undefined);
    assert.strictEqual(detail.data.stage, undefined);
    assert.deepStrictEqual(detail.data.attachments, []);
  });

  it('购买后解锁联系方式、地址、项目现状与附件', async () => {
    const buyRes = await apiPost('/orders', { opportunityId: publishedId }, userBToken);
    assert.strictEqual(buyRes.code, 0);

    const detail = await apiGet(`/opportunities/${publishedId}`, userBToken);
    assert.strictEqual(detail.data.isPurchased, true);
    assert.strictEqual(detail.data.contactName, '王经理');
    assert.strictEqual(detail.data.address, '');
    assert.strictEqual(detail.data.stage, 'design');
    assert.strictEqual(detail.data.attachments.length, 2);
  });

  it('购买自动入库 CRM', async () => {
    const crmList = await apiGet('/crm', userBToken);
    assert.strictEqual(crmList.code, 0);
    const match = crmList.data.list.find((c) => c.title && c.title.includes('P1测试'));
    assert.ok(match, 'CRM 中应存在购买入库记录');
    crmId = match.id;
  });

  it('跟进记录支持全部 7 种状态', async () => {
    assert.ok(crmId, '依赖 CRM 入库');
    for (const status of FOLLOW_UP_STATUSES) {
      const res = await apiPost('/follow-ups', {
        crmOpportunityId: crmId,
        status,
        contentPrivate: `状态 ${status} 测试`,
      }, userBToken);
      assert.strictEqual(res.code, 0, `status ${status} 应可写入`);
    }
  });

  it('新增跟进默认状态为 call_no_answer', async () => {
    const marker = `不指定状态-${Date.now()}`;
    const res = await apiPost('/follow-ups', {
      crmOpportunityId: crmId,
      contentPrivate: marker,
    }, userBToken);
    assert.strictEqual(res.code, 0);
    const list = await apiGet(`/follow-ups/${crmId}`, userBToken);
    assert.strictEqual(list.code, 0);
    const created = list.data.find((f) => f.content_private === marker);
    assert.ok(created, '应能找到刚创建的跟进');
    assert.strictEqual(created.status, 'call_no_answer');
  });

  it('提醒中心返回跟进 7 状态', async () => {
    // 明天日期，保证在 upcoming 范围内
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    const nextDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    // 唯一标识，避免重复运行时匹配到历史数据
    const marker = `提醒中心状态验证-${Date.now()}`;

    // 给一条近期待跟进的记录
    await apiPost('/follow-ups', {
      crmOpportunityId: crmId,
      status: 'negotiating',
      contentPrivate: marker,
      nextFollowDate: nextDate,
    }, userBToken);

    const reminders = await apiGet('/reminders?type=upcoming', userBToken);
    assert.strictEqual(reminders.code, 0);
    const match = reminders.data.list.find((r) => r.contentPrivate === marker);
    assert.ok(match, '提醒中心应返回该记录');
    assert.strictEqual(match.status, 'negotiating');
    assert.strictEqual(match.crmOpportunityId, crmId);
  });

  it('协议动态接口返回配置内容', async () => {
    const res = await apiGet('/agreement/agreement');
    assert.strictEqual(res.code, 0);
    assert.strictEqual(res.data.title, '用户协议');
    assert.ok(res.data.sections.length >= 5);
  });

  it('协议动态接口对非法类型返回 404', async () => {
    const res = await apiGet('/agreement/nonexistent');
    assert.strictEqual(res.code, 404);
  });

  it('跟进状态枚举不允许旧值 initial_contact', async () => {
    const res = await apiPost('/follow-ups', {
      crmOpportunityId: crmId,
      status: 'initial_contact',
      contentPrivate: '旧状态应被拒绝',
    }, userBToken);
    assert.notStrictEqual(res.code, 0);
  });
});
