// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import Points from '../src/pages/Points';
import PointsFlow from '../src/pages/PointsFlow';
import MemberLevel from '../src/pages/MemberLevel';
import Credit from '../src/pages/Credit';

vi.mock('../src/api', () => ({
  api: {
    pointsBalance: vi.fn(),
    pointsLogs: vi.fn(),
    recharge: vi.fn(),
    rechargeChannels: vi.fn(),
    rechargeOrderStatus: vi.fn(),
    rechargeMockPay: vi.fn(),
    myStats: vi.fn(),
    credits: vi.fn(),
    me: vi.fn(),
  },
}));

vi.mock('../src/context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    AuthProvider: ({ children }) => <React.Fragment>{children}</React.Fragment>,
    useAuth: () => ({
      user: { id: 1, nickname: '测试', phone: '13800000001', pointsBalance: 100, level: 'normal', creditScore: 88 },
      token: 'test-token',
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn().mockResolvedValue({}),
      updateUser: vi.fn(),
    }),
  };
});

describe('积分中心 Points（开发需求 5.2 积分体系）', () => {
  afterEach(() => cleanup());

  beforeEach(async () => {
    vi.clearAllMocks();
    const { api } = await import('../src/api');
    api.rechargeChannels.mockResolvedValue({ channels: ['mock'], defaultChannel: 'mock' });
  });

  it('展示积分余额/已充值/已消耗与充值入口', async () => {
    const { api } = await import('../src/api');
    api.pointsBalance.mockResolvedValue({ balance: 666, total_recharged: 500, total_consumed: 200 });
    api.pointsLogs.mockResolvedValue({ list: [], total: 0 });
    render(
      <MemoryRouter>
        <Points />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('666')).toBeTruthy());
    expect(screen.getByText('已充值 500')).toBeTruthy();
    expect(screen.getByText('已消耗 200')).toBeTruthy();
    expect(screen.getByText('充值积分')).toBeTruthy();
  });

  it('充值弹窗选择金额后调用 recharge 接口', async () => {
    const { api } = await import('../src/api');
    api.pointsBalance.mockResolvedValue({ balance: 100, total_recharged: 0, total_consumed: 0 });
    api.pointsLogs.mockResolvedValue({ list: [], total: 0 });
    api.rechargeChannels.mockResolvedValue({ channels: ['mock'], defaultChannel: 'mock' });
    api.recharge.mockResolvedValue({ orderNo: 'R123', channel: 'mock', payUrl: 'mock://pay', payMethod: 'manual', amount: 100 });
    api.rechargeMockPay.mockResolvedValue({ code: 0, data: { status: 'paid', amount: 100 } });
    api.rechargeOrderStatus.mockResolvedValue({ status: 'paid', amount: 100 });
    render(
      <MemoryRouter>
        <Points />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getAllByText('充值积分').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('充值积分')[0]);
    await waitFor(() => expect(screen.getByText('100 积分')).toBeTruthy());
    fireEvent.click(screen.getByText('100 积分'));
    fireEvent.click(screen.getAllByText('确认')[0]);
    await waitFor(() => expect(api.recharge).toHaveBeenCalledWith({ amount: 100 }));
  });

  it('积分流水列表展示来源标题与增减金额', async () => {
    const { api } = await import('../src/api');
    api.pointsBalance.mockResolvedValue({ balance: 100, total_recharged: 0, total_consumed: 0 });
    api.pointsLogs.mockResolvedValue({
      list: [
        { id: 1, source_title: '注册赠送', source_type: 'register_gift', delta: 10, created_at: '2026-08-01' },
        { id: 2, source_title: '购买商机', source_type: 'consume', delta: -88, created_at: '2026-08-02' },
      ],
      total: 2,
    });
    render(
      <MemoryRouter>
        <Points />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('注册赠送')).toBeTruthy());
    expect(screen.getByText('+10')).toBeTruthy();
    expect(screen.getByText('购买商机')).toBeTruthy();
    expect(screen.getByText('-88')).toBeTruthy();
  });
});

describe('积分流水 PointsFlow', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('展示流水记录与正负金额', async () => {
    const { api } = await import('../src/api');
    api.pointsLogs.mockResolvedValue({
      list: [
        { id: 1, source_title: '邀请奖励', source_type: 'invite_gift', delta: 5, created_at: '2026-08-01' },
        { id: 2, source_title: '分佣收入', source_type: 'commission', delta: 20, created_at: '2026-08-02' },
      ],
      total: 2,
    });
    render(
      <MemoryRouter>
        <PointsFlow />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('邀请奖励')).toBeTruthy());
    expect(screen.getByText('+5')).toBeTruthy();
    expect(screen.getByText('分佣收入')).toBeTruthy();
    expect(screen.getByText('+20')).toBeTruthy();
  });

  it('切换收入/支出 Tab 重新拉取对应类型', async () => {
    const { api } = await import('../src/api');
    api.pointsLogs.mockResolvedValue({ list: [], total: 0 });
    render(
      <MemoryRouter>
        <PointsFlow />
      </MemoryRouter>
    );
    await waitFor(() => expect(api.pointsLogs).toHaveBeenCalled());
    fireEvent.click(screen.getByText('支出'));
    await waitFor(() => {
      const lastCall = api.pointsLogs.mock.calls[api.pointsLogs.mock.calls.length - 1][0];
      return expect(lastCall.type).toBe('expense');
    });
  });
});

describe('会员等级 MemberLevel（开发需求 5.6）', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('展示当前等级与四维度评分', async () => {
    const { api } = await import('../src/api');
    api.myStats.mockResolvedValue({
      level: {
        level: 'silver',
        purchase_rate: 35,
        invalid_rate: 8,
        helpful_rate: 60,
        activity_score: 80,
        composite_score: 72,
      },
    });
    render(
      <MemoryRouter>
        <MemberLevel />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('35%')).toBeTruthy());
    expect(screen.getByText('8%')).toBeTruthy();
    expect(screen.getByText('60%')).toBeTruthy();
    expect(screen.getByText('72')).toBeTruthy();
  });

  it('展示等级说明与晋升条件', async () => {
    const { api } = await import('../src/api');
    api.myStats.mockResolvedValue({ level: { level: 'normal' } });
    render(
      <MemoryRouter>
        <MemberLevel />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('等级说明')).toBeTruthy());
    expect(screen.getByText(/投稿购买率≥30%/)).toBeTruthy();
    expect(screen.getByText(/投稿购买率≥50%/)).toBeTruthy();
    expect(screen.getByText(/投稿购买率≥70%/)).toBeTruthy();
  });
});

describe('信用分 Credit（开发需求 5.7）', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('展示信用分与等级标签（>=80 信用良好）', async () => {
    const { api } = await import('../src/api');
    api.me.mockResolvedValue({ creditScore: 88 });
    api.credits.mockResolvedValue({ list: [], total: 0 });
    render(
      <MemoryRouter>
        <Credit />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('88')).toBeTruthy());
    expect(screen.getByText('信用良好')).toBeTruthy();
  });

  it('展示信用分变动记录', async () => {
    const { api } = await import('../src/api');
    api.me.mockResolvedValue({ creditScore: 90 });
    api.credits.mockResolvedValue({
      list: [
        { id: 1, reason: '投稿商机被购买', sourceType: 'purchase', delta: 2, createdAt: '2026-08-01' },
        { id: 2, reason: '商机被判无效', sourceType: 'invalid_mark', delta: -10, createdAt: '2026-08-02' },
      ],
      total: 2,
    });
    render(
      <MemoryRouter>
        <Credit />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('投稿商机被购买')).toBeTruthy());
    expect(screen.getByText('商机被判无效')).toBeTruthy();
  });

  it('低信用分（<60）展示信用较差标签', async () => {
    const { api } = await import('../src/api');
    api.me.mockResolvedValue({ creditScore: 45 });
    api.credits.mockResolvedValue({ list: [], total: 0 });
    render(
      <MemoryRouter>
        <Credit />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('信用较差')).toBeTruthy());
  });
});