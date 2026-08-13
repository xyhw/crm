// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';
import OpportunityDetail from '../src/pages/OpportunityDetail';
import Publish from '../src/pages/Publish';
import MyOrders from '../src/pages/MyOrders';

vi.mock('../src/api', () => ({
  api: {
    opportunity: vi.fn(),
    purchase: vi.fn(),
    markInvalid: vi.fn(),
    createOpportunity: vi.fn(),
    opportunities: vi.fn(),
    banners: vi.fn().mockResolvedValue({ list: [] }),
    me: vi.fn().mockResolvedValue({ nickname: '测试' }),
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

const makeDetail = (over = {}) => ({
  id: 25,
  title: '某国际酒店装修总包项目',
  categoryName: '装修总包',
  city: '杭州',
  brand: '维也纳酒店',
  price: 88,
  purchaseCount: 12,
  viewCount: 30,
  status: 'active',
  descriptionPublic: '公开描述',
  descriptionFull: '完整联系方式与详情',
  contactName: '张工',
  contactPhone: '13800000001',
  isPurchased: false,
  isPublisher: false,
  publisherName: '投稿人甲',
  publisherCompany: '某某工程公司',
  marketIntelligence: { totalShares: 0, statusDistribution: {} },
  createdAt: '2026-08-01T00:00:00.000Z',
  ...over,
});

describe('跟单详情（开发需求 6.1.2/6.1.3 购买解锁）', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未购买时仅展示公开字段，解锁信息被锁定', async () => {
    const { api } = await import('../src/api');
    api.opportunity.mockResolvedValue(makeDetail());
    render(
      <MemoryRouter initialEntries={['/opportunity/25']}>
        <Routes>
          <Route path="/opportunity/:id" element={<OpportunityDetail />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('某国际酒店装修总包项目')).toBeTruthy());
    expect(screen.getByText('公开描述')).toBeTruthy();
    expect(screen.getByText(/购买后查看联系方式/)).toBeTruthy();
    expect(screen.queryByText('完整联系方式与详情')).toBeNull();
    expect(screen.queryByText('张工')).toBeNull();
  });

  it('已购买后展示解锁字段（联系方式/完整描述/市场情报）', async () => {
    const { api } = await import('../src/api');
    api.opportunity.mockResolvedValue(makeDetail({
      isPurchased: true,
      marketIntelligence: { totalShares: 2, statusDistribution: { interested: 1, negotiating: 1 } },
    }));
    render(
      <MemoryRouter initialEntries={['/opportunity/25']}>
        <Routes>
          <Route path="/opportunity/:id" element={<OpportunityDetail />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('完整联系方式与详情')).toBeTruthy());
    expect(screen.getByText('张工')).toBeTruthy();
    expect(screen.getByText('13800000001')).toBeTruthy();
    expect(screen.getByText('基于 2 位购买者跟进')).toBeTruthy();
    expect(screen.getByText('意向明确')).toBeTruthy();
  });

  it('发布者身份无需购买即可查看完整内容', async () => {
    const { api } = await import('../src/api');
    api.opportunity.mockResolvedValue(makeDetail({ isPublisher: true }));
    render(
      <MemoryRouter initialEntries={['/opportunity/25']}>
        <Routes>
          <Route path="/opportunity/:id" element={<OpportunityDetail />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('完整联系方式与详情')).toBeTruthy());
    expect(screen.getByText('投稿人甲')).toBeTruthy();
    expect(screen.getByText('某某工程公司')).toBeTruthy();
  });

  it('购买按钮调用 purchase 接口并携带 opportunityId', async () => {
    const { api } = await import('../src/api');
    api.opportunity.mockResolvedValueOnce(makeDetail()).mockResolvedValueOnce(makeDetail({ isPurchased: true }));
    api.purchase.mockResolvedValue({});
    render(
      <MemoryRouter initialEntries={['/opportunity/25']}>
        <Routes>
          <Route path="/opportunity/:id" element={<OpportunityDetail />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText(/花费 88 积分解锁/)).toBeTruthy());
    fireEvent.click(screen.getByText(/花费 88 积分解锁/));
    await waitFor(() => expect(screen.getByText('确认购买')).toBeTruthy());
    expect(screen.getByText('原价')).toBeTruthy();
    expect(screen.getByText('实付')).toBeTruthy();
    expect(screen.getByText('会员折扣（普通会员）')).toBeTruthy();
    fireEvent.click(screen.getAllByText('确认')[0]);
    await waitFor(() => expect(api.purchase).toHaveBeenCalled());
    expect(api.purchase).toHaveBeenCalledWith({ opportunityId: 25 });
  });
});

describe('发布跟单（开发需求 5.3 投稿上架 + 相似度检测）', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染核心表单字段与提交按钮', async () => {
    render(
      <MemoryRouter>
        <Publish />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByPlaceholderText('如：某酒店弱电总包采购')).toBeTruthy());
    expect(screen.getByPlaceholderText('建议10-200积分')).toBeTruthy();
    expect(screen.getByText('下一步')).toBeTruthy();
  });

  it('进入第二步后展示补充详情与发布按钮', async () => {
    const { api } = await import('../src/api');
    api.createOpportunity.mockResolvedValue({});
    render(
      <MemoryRouter>
        <Publish />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByPlaceholderText('如：某酒店弱电总包采购')).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText('如：某酒店弱电总包采购'), { target: { value: '测试跟单' } });
    fireEvent.change(screen.getByPlaceholderText('建议10-200积分'), { target: { value: '88' } });
    fireEvent.click(screen.getAllByPlaceholderText('请选择')[0]);
    await waitFor(() => expect(screen.getByText('装修总包')).toBeTruthy());
    fireEvent.click(screen.getByText('装修总包'));
    await new Promise((r) => setTimeout(r, 200));
    fireEvent.click(screen.getAllByText('确认')[0]);
    await new Promise((r) => setTimeout(r, 100));
    fireEvent.click(screen.getByText('下一步'));
    await waitFor(() => expect(screen.getByPlaceholderText('如：上海')).toBeTruthy());
    expect(screen.getByText('标签（最多5个）')).toBeTruthy();
    expect(screen.getByText('图纸附件（最多9个）')).toBeTruthy();
    expect(screen.getAllByText('发布跟单').length).toBeGreaterThan(0);
  });

  it('缺少必填分类时被拦截（校验生效）', async () => {
    const { api } = await import('../src/api');
    api.createOpportunity.mockResolvedValue({});
    render(
      <MemoryRouter>
        <Publish />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByPlaceholderText('如：某酒店弱电总包采购')).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText('如：某酒店弱电总包采购'), { target: { value: '测试跟单' } });
    fireEvent.change(screen.getByPlaceholderText('建议10-200积分'), { target: { value: '88' } });
    fireEvent.click(screen.getByText('下一步'));
    await waitFor(() => expect(screen.queryByPlaceholderText('如：上海')).toBeNull());
    expect(api.createOpportunity).not.toHaveBeenCalled();
  });

  it('完整填写后调用 createOpportunity 并携带标题与数字价格', async () => {
    const { api } = await import('../src/api');
    api.createOpportunity.mockResolvedValue({});
    render(
      <MemoryRouter>
        <Publish />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByPlaceholderText('如：某酒店弱电总包采购')).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText('如：某酒店弱电总包采购'), { target: { value: '弱电总包采购' } });
    fireEvent.change(screen.getByPlaceholderText('建议10-200积分'), { target: { value: '66' } });
    fireEvent.click(screen.getAllByPlaceholderText('请选择')[0]);
    await waitFor(() => expect(screen.getByText('装修总包')).toBeTruthy());
    fireEvent.click(screen.getByText('装修总包'));
    await new Promise((r) => setTimeout(r, 200));
    fireEvent.click(screen.getAllByText('确认')[0]);
    await new Promise((r) => setTimeout(r, 100));
    fireEvent.click(screen.getByText('下一步'));
    await waitFor(() => expect(screen.getAllByText('发布跟单').length).toBeGreaterThan(0));
    const pubBtns = screen.getAllByText('发布跟单');
    fireEvent.click(pubBtns[pubBtns.length - 1]);
    await waitFor(() => expect(api.createOpportunity).toHaveBeenCalled());
    const payload = api.createOpportunity.mock.calls[0][0];
    expect(payload.title).toBe('弱电总包采购');
    expect(payload.price).toBe(66);
    expect(payload.categoryId).toBeTruthy();
  });

  it('相似度检测命中时展示相似跟单提示', async () => {
    const { api } = await import('../src/api');
    api.createOpportunity.mockResolvedValue({
      similarOpportunities: [{ id: 3, title: '疑似相似跟单' }],
    });
    render(
      <MemoryRouter>
        <Publish />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByPlaceholderText('如：某酒店弱电总包采购')).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText('如：某酒店弱电总包采购'), { target: { value: '撞单测试' } });
    fireEvent.change(screen.getByPlaceholderText('建议10-200积分'), { target: { value: '88' } });
    fireEvent.click(screen.getAllByPlaceholderText('请选择')[0]);
    await waitFor(() => expect(screen.getByText('装修总包')).toBeTruthy());
    fireEvent.click(screen.getByText('装修总包'));
    await new Promise((r) => setTimeout(r, 200));
    fireEvent.click(screen.getAllByText('确认')[0]);
    await new Promise((r) => setTimeout(r, 100));
    fireEvent.click(screen.getByText('下一步'));
    await waitFor(() => expect(screen.getAllByText('发布跟单').length).toBeGreaterThan(0));
    const pubBtns = screen.getAllByText('发布跟单');
    fireEvent.click(pubBtns[pubBtns.length - 1]);
    await waitFor(() => expect(screen.getByText('发现相似跟单')).toBeTruthy());
    expect(screen.getByText('疑似相似跟单')).toBeTruthy();
  });
});

describe('我的订单 MyOrders', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染已发布与已购买订单并展示标题/价格', async () => {
    const { api } = await import('../src/api');
    api.opportunities.mockResolvedValue({
      list: [
        { id: 1, title: '我发布的单', status: 'active', price: 50, city: '上海', isPurchased: false, isPublisher: true, purchaseCount: 3, createdAt: '2026-08-01T00:00:00.000Z' },
        { id: 2, title: '我购买的单', status: 'active', price: 88, city: '杭州', isPurchased: true, isPublisher: false, purchaseCount: 12, createdAt: '2026-08-01T00:00:00.000Z' },
      ],
      total: 2,
    });
    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('我发布的单')).toBeTruthy());
    expect(screen.getByText('我发布')).toBeTruthy();
    fireEvent.click(screen.getByText('我购买的'));
    await waitFor(() => expect(screen.getByText('我购买的单')).toBeTruthy());
    expect(screen.getByText('我已购')).toBeTruthy();
  });

  it('空数据展示空态', async () => {
    const { api } = await import('../src/api');
    api.opportunities.mockResolvedValue({ list: [], total: 0 });
    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText(/暂无发布记录/)).toBeTruthy());
  });
});