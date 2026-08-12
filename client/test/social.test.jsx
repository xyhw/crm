// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';
import Invite from '../src/pages/Invite';
import Ranking from '../src/pages/Ranking';
import Notifications from '../src/pages/Notifications';
import ReminderCenter from '../src/pages/ReminderCenter';
import Agreement from '../src/pages/Agreement';

vi.mock('../src/api', () => ({
  api: {
    invitationMe: vi.fn(),
    me: vi.fn(),
    rankings: vi.fn(),
    notifications: vi.fn(),
    markAllRead: vi.fn(),
    markNotificationRead: vi.fn(),
    reminders: vi.fn(),
    agreement: vi.fn(),
  },
}));

vi.mock('../src/context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    AuthProvider: ({ children }) => <React.Fragment>{children}</React.Fragment>,
    useAuth: () => ({
      user: { id: 1, nickname: '测试', phone: '13800000001', pointsBalance: 100, level: 'normal' },
      token: 'test-token',
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn().mockResolvedValue({}),
      updateUser: vi.fn(),
    }),
  };
});

describe('邀请好友 Invite（开发需求 5.9）', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('展示邀请码/奖励说明/已邀请人数/累计奖励', async () => {
    const { api } = await import('../src/api');
    api.invitationMe.mockResolvedValue({
      inviteCode: 'HOF88888',
      stats: { totalInvited: 5, totalReward: 25 },
      records: [],
    });
    api.me.mockResolvedValue({ nickname: '测试' });
    render(
      <MemoryRouter>
        <Invite />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('HOF88888')).toBeTruthy());
    expect(screen.getByText('邀请人和被邀请人各得5积分')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('25 积分')).toBeTruthy();
    expect(screen.getByText('复制邀请码')).toBeTruthy();
  });

  it('展示邀请记录列表', async () => {
    const { api } = await import('../src/api');
    api.invitationMe.mockResolvedValue({
      inviteCode: 'HOF88888',
      stats: { totalInvited: 2, totalReward: 10 },
      records: [
        { id: 1, invitee_nickname: '新供应商A', created_at: '2026-08-01', reward: 5 },
        { id: 2, invitee_nickname: '新供应商B', created_at: '2026-08-02', reward: 5 },
      ],
    });
    api.me.mockResolvedValue({ nickname: '测试' });
    render(
      <MemoryRouter>
        <Invite />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('新供应商A')).toBeTruthy());
    expect(screen.getByText('新供应商B')).toBeTruthy();
  });
});

describe('排行榜 Ranking（开发需求 6.1.7）', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('跟单达人榜展示排名/昵称/购买次数', async () => {
    const { api } = await import('../src/api');
    api.rankings.mockResolvedValue({
      list: [
        { id: 1, rank: 1, nickname: '达人甲', purchase_count: 30 },
        { id: 2, rank: 2, nickname: '达人乙', purchase_count: 20 },
      ],
      total: 2,
    });
    render(
      <MemoryRouter>
        <Ranking />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('达人甲')).toBeTruthy());
    expect(screen.getByText('30 次购买')).toBeTruthy();
    expect(screen.getByText('达人乙')).toBeTruthy();
    expect(screen.getByText('20 次购买')).toBeTruthy();
  });

  it('切换贡献榜展示有用次数并重新拉取', async () => {
    const { api } = await import('../src/api');
    api.rankings.mockResolvedValue({
      list: [{ id: 3, rank: 1, nickname: '贡献者丙', helpful_count: 15 }],
      total: 1,
    });
    render(
      <MemoryRouter>
        <Ranking />
      </MemoryRouter>
    );
    await waitFor(() => expect(api.rankings).toHaveBeenCalled());
    fireEvent.click(screen.getByText('贡献榜'));
    await waitFor(() => {
      const lastCall = api.rankings.mock.calls[api.rankings.mock.calls.length - 1][0];
      return expect(lastCall.type).toBe('contributor');
    });
    await waitFor(() => expect(screen.getByText('15 次有用')).toBeTruthy());
  });
});

describe('通知中心 Notifications（开发需求 6.1.8）', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('展示通知列表与未读标记', async () => {
    const { api } = await import('../src/api');
    api.notifications.mockResolvedValue({
      list: [
        { id: 1, title: '注册赠送积分', content: '欢迎注册，赠送10积分', is_read: 0, created_at: '2026-08-01' },
        { id: 2, title: '跟单被购买', content: '您的跟单被购买，获得分佣', is_read: 1, created_at: '2026-08-02' },
      ],
      unreadCount: 1,
      total: 2,
    });
    render(
      <MemoryRouter>
        <Notifications />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('注册赠送积分')).toBeTruthy());
    expect(screen.getByText('欢迎注册，赠送10积分')).toBeTruthy();
    expect(screen.getByText('跟单被购买')).toBeTruthy();
    expect(document.body.innerHTML.includes('unread')).toBe(true);
  });

  it('点击未读通知调用 markNotificationRead', async () => {
    const { api } = await import('../src/api');
    api.notifications.mockResolvedValue({
      list: [{ id: 1, title: '通知A', content: '内容', is_read: 0, created_at: '2026-08-01' }],
      unreadCount: 1,
      total: 1,
    });
    api.markNotificationRead.mockResolvedValue({});
    render(
      <MemoryRouter>
        <Notifications />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('通知A')).toBeTruthy());
    fireEvent.click(screen.getByText('通知A').closest('div'));
    await waitFor(() => expect(api.markNotificationRead).toHaveBeenCalledWith(1));
  });

  it('切换分类 Tab 按类型拉取', async () => {
    const { api } = await import('../src/api');
    api.notifications.mockResolvedValue({ list: [], unreadCount: 0, total: 0 });
    render(
      <MemoryRouter>
        <Notifications />
      </MemoryRouter>
    );
    await waitFor(() => expect(api.notifications).toHaveBeenCalled());
    fireEvent.click(screen.getByText('交易'));
    await waitFor(() => {
      const lastCall = api.notifications.mock.calls[api.notifications.mock.calls.length - 1][0];
      return expect(lastCall.type).toBe('trade');
    });
  });
});

describe('提醒中心 ReminderCenter（开发需求 6.1.4）', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('今日待跟进展示提醒卡片标题/城市/状态', async () => {
    const { api } = await import('../src/api');
    api.reminders.mockResolvedValue({
      list: [
        { id: 1, opportunityTitle: '某酒店弱电项目', city: '杭州', status: 'interested', crmOpportunityId: 25, nextFollowDate: '2026-08-12' },
      ],
      total: 1,
    });
    render(
      <MemoryRouter>
        <ReminderCenter />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('某酒店弱电项目')).toBeTruthy());
    expect(screen.getByText('杭州')).toBeTruthy();
    expect(screen.getByText('今日需跟进')).toBeTruthy();
  });

  it('切换逾期 Tab 重新拉取并展示已逾期标记', async () => {
    const { api } = await import('../src/api');
    api.reminders.mockResolvedValue({
      list: [{ id: 2, opportunityTitle: '逾期项目', city: '上海', status: 'call_no_answer', crmOpportunityId: 26 }],
      total: 1,
    });
    render(
      <MemoryRouter>
        <ReminderCenter />
      </MemoryRouter>
    );
    await waitFor(() => expect(api.reminders).toHaveBeenCalled());
    fireEvent.click(screen.getByText('逾期未跟进'));
    await waitFor(() => {
      const lastCall = api.reminders.mock.calls[api.reminders.mock.calls.length - 1][0];
      return expect(lastCall.type).toBe('overdue');
    });
    await waitFor(() => expect(screen.getByText('已逾期')).toBeTruthy());
  });
});

describe('协议页 Agreement（开发需求 6.1.1）', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('默认渲染用户协议静态内容', async () => {
    const { api } = await import('../src/api');
    api.agreement.mockRejectedValue(new Error('not configured'));
    render(
      <MemoryRouter initialEntries={['/agreement/agreement']}>
        <Routes>
          <Route path="/agreement/:type" element={<Agreement />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getAllByText('用户协议').length).toBeGreaterThan(0));
    expect(screen.getByText('一、服务说明')).toBeTruthy();
    expect(screen.getByText('四、积分与交易')).toBeTruthy();
  });

  it('动态配置覆盖静态内容', async () => {
    const { api } = await import('../src/api');
    api.agreement.mockResolvedValue({
      title: '自定义协议',
      sections: [{ h: '条款一', p: '自定义条款内容' }],
    });
    render(
      <MemoryRouter initialEntries={['/agreement/privacy']}>
        <Routes>
          <Route path="/agreement/:type" element={<Agreement />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('自定义协议')).toBeTruthy());
    expect(screen.getByText('条款一')).toBeTruthy();
    expect(screen.getByText('自定义条款内容')).toBeTruthy();
  });

  it('隐私政策与平台须知路由分别渲染对应内容', async () => {
    const { api } = await import('../src/api');
    api.agreement.mockRejectedValue(new Error('not configured'));
    const { unmount } = render(
      <MemoryRouter initialEntries={['/agreement/privacy']}>
        <Routes>
          <Route path="/agreement/:type" element={<Agreement />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getAllByText('隐私政策').length).toBeGreaterThan(0));
    expect(screen.getByText('一、信息收集')).toBeTruthy();
    unmount();
    cleanup();
    render(
      <MemoryRouter initialEntries={['/agreement/summary']}>
        <Routes>
          <Route path="/agreement/:type" element={<Agreement />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getAllByText('平台须知').length).toBeGreaterThan(0));
    expect(screen.getByText('账号安全')).toBeTruthy();
  });
});