// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import Home from '../src/pages/Home';
import Hall from '../src/pages/Hall';

vi.mock('../src/api', () => ({
  api: {
    opportunities: vi.fn(),
    myStats: vi.fn(),
    banners: vi.fn().mockResolvedValue({ list: [] }),
    notifications: vi.fn().mockResolvedValue({ list: [], unreadCount: 0 }),
    reminders: vi.fn().mockResolvedValue({ list: [] }),
    announcements: vi.fn().mockResolvedValue({ list: [] }),
    me: vi.fn().mockResolvedValue({ nickname: '测试' }),
  },
}));

vi.mock('../src/context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    AuthProvider: ({ children }) => <React.Fragment>{children}</React.Fragment>,
    useAuth: () => ({
      user: { id: 1, nickname: '测试', phone: '13800000001', pointsBalance: 666, level: 'normal' },
      token: 'test-token',
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn().mockResolvedValue({}),
      updateUser: vi.fn(),
    }),
  };
});

const OPP = {
  id: 25,
  title: '某国际酒店装修总包项目',
  categoryIcon: '🏗',
  hotelName: '维也纳酒店',
  categoryName: '装修总包',
  city: '杭州',
  price: 88,
  purchaseCount: 12,
  createdAt: new Date().toISOString(),
  isPurchased: false,
};

describe('首页 Home（开发需求 6.1.2 商机中心）', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染用户信息与积分余额', async () => {
    const { api } = await import('../src/api');
    api.opportunities.mockResolvedValue({ list: [OPP], total: 1 });
    api.myStats.mockResolvedValue({ published: 3, crm: 5 });
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('维也纳酒店 · 装修总包 · 杭州')).toBeTruthy());
    expect(screen.getByText('测试')).toBeTruthy();
    expect(screen.getByText('666')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('最新商机列表展示关键字段：标题/分类/价格/购买数', async () => {
    const { api } = await import('../src/api');
    api.opportunities.mockResolvedValue({ list: [OPP], total: 1 });
    api.myStats.mockResolvedValue({ published: 0, crm: 0 });
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('某国际酒店装修总包项目')).toBeTruthy());
    expect(screen.getByText('维也纳酒店 · 装修总包 · 杭州')).toBeTruthy();
    expect(screen.getByText('88 积分')).toBeTruthy();
    expect(screen.getByText('12人已购买')).toBeTruthy();
    expect(screen.getByText('查看全部')).toBeTruthy();
  });

  it('无商机时展示空态与发布引导', async () => {
    const { api } = await import('../src/api');
    api.opportunities.mockResolvedValue({ list: [], total: 0 });
    api.myStats.mockResolvedValue({ published: 0, crm: 0 });
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('暂无商机')).toBeTruthy());
    expect(screen.getByText('立即发布')).toBeTruthy();
  });

  it('有未读通知与今日待跟进时展示提醒条', async () => {
    const { api } = await import('../src/api');
    api.opportunities.mockResolvedValue({ list: [], total: 0 });
    api.myStats.mockResolvedValue({ published: 0, crm: 0 });
    api.notifications.mockResolvedValue({ list: [], unreadCount: 3 });
    api.reminders.mockResolvedValue({ list: [{ id: 1 }, { id: 2 }] });
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('3 条未读通知')).toBeTruthy());
    expect(screen.getByText('2 条今日待跟进')).toBeTruthy();
  });

  it('存在公告时首页顶部展示公告栏', async () => {
    const { api } = await import('../src/api');
    api.opportunities.mockResolvedValue({ list: [], total: 0 });
    api.myStats.mockResolvedValue({ published: 0, crm: 0 });
    api.announcements.mockResolvedValue({
      list: [{ id: 1, title: '平台维护通知', media_type: 'text' }],
    });
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('公告')).toBeTruthy());
    expect(screen.getByText('平台维护通知')).toBeTruthy();
  });

  it('无公告时不展示公告栏', async () => {
    const { api } = await import('../src/api');
    api.opportunities.mockResolvedValue({ list: [], total: 0 });
    api.myStats.mockResolvedValue({ published: 0, crm: 0 });
    api.announcements.mockResolvedValue({ list: [] });
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('暂无商机')).toBeTruthy());
    expect(screen.queryByText('公告')).toBeNull();
  });
});

describe('商机大厅 Hall', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('列表渲染：分类 icon/标题/价格/购买人数，已购买标 Tag', async () => {
    const { api } = await import('../src/api');
    api.opportunities.mockResolvedValue({
      list: [
        OPP,
        { ...OPP, id: 26, title: '弱电总包项目', isPurchased: true, price: 120, purchaseCount: 5 },
      ],
      total: 2,
    });
    render(
      <MemoryRouter>
        <Hall />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('某国际酒店装修总包项目')).toBeTruthy());
    expect(screen.getByText('弱电总包项目')).toBeTruthy();
    expect(screen.getAllByText(/积分/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('已解锁')).toBeTruthy();
    expect(screen.getByText(/已解锁全部联系方式/)).toBeTruthy();
    expect(screen.getByText('12人已购')).toBeTruthy();
  });

  it('空数据展示空态', async () => {
    const { api } = await import('../src/api');
    api.opportunities.mockResolvedValue({ list: [], total: 0 });
    render(
      <MemoryRouter>
        <Hall />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText(/暂无|\b0\b/)).toBeTruthy());
  });
});