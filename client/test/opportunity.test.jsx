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
    markHelpful: vi.fn(),
    reportShare: vi.fn(),
    createOpportunity: vi.fn(),
    opportunities: vi.fn(),
    myOrders: vi.fn(),
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
  address: '西湖区文三路100号维也纳酒店',
  price: 88,
  purchaseCount: 12,
  viewCount: 30,
  status: 'active',
  descriptionFull: '完整联系方式与详情',
  contactName: '张工',
  contactPhone: '13800000001',
  wechat: 'zhang_gong',
  stage: '已完成设计，正在招投标',
  isPurchased: false,
  isPublisher: false,
  publisherName: '投稿人甲',
  publisherCompany: '某某工程公司',
  marketIntelligence: { totalShares: 0, statusDistribution: {} },
  createdAt: '2026-08-01T00:00:00.000Z',
  ...over,
});

describe('商机详情（开发需求 6.1.2/6.1.3 购买解锁）', () => {
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
    expect(screen.queryByText('西湖区文三路100号维也纳酒店')).toBeNull();
    expect(screen.getByText(/购买后查看/)).toBeTruthy();
    expect(screen.queryByText('完整联系方式与详情')).toBeNull();
    expect(screen.queryByText('张工')).toBeNull();
    expect(screen.queryByText('zhang_gong')).toBeNull();
  });

  it('已购买后展示解锁字段（联系方式/完整描述/微信号/市场情报）', async () => {
    const { api } = await import('../src/api');
    api.opportunity.mockResolvedValue(makeDetail({
      isPurchased: true,
      marketIntelligence: {
        totalShares: 2,
        statusDistribution: { interested: 1, negotiating: 1 },
        shareBoard: [
          {
            shareId: 1,
            status: 'interested',
            summary: '甲方明确意向',
            helpfulCount: 3,
            createdAt: '2026-08-20T00:00:00.000Z',
            nickname: '投稿人乙',
            isOwn: false,
            isLiked: false,
            reportCount: 0,
            isReported: false,
          },
          {
            shareId: 2,
            status: 'negotiating',
            summary: '已约二次报价',
            helpfulCount: 0,
            createdAt: '2026-08-19T00:00:00.000Z',
            nickname: '投稿人丙',
            isOwn: false,
            isLiked: true,
            reportCount: 2,
            isReported: false,
          },
        ],
      },
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
    expect(screen.getByText('zhang_gong')).toBeTruthy();
    expect(screen.getByText('西湖区文三路100号维也纳酒店')).toBeTruthy();
    expect(screen.getByText('已完成设计，正在招投标')).toBeTruthy();
    expect(screen.getByText('2 位购买者共享了进度')).toBeTruthy();
    expect(screen.getByText('共享进度榜')).toBeTruthy();
    expect(screen.getByText('甲方明确意向')).toBeTruthy();
    expect(screen.getByText('已约二次报价')).toBeTruthy();
    expect(document.querySelector('.mi-report-btn')).toBeTruthy();
    expect(document.querySelector('.mi-like-btn')).toBeTruthy();
    expect(screen.getByText('意向明确')).toBeTruthy();
    expect(screen.getByText('标记无效')).toBeTruthy();
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
    expect(document.querySelector('.detail-publisher__name').textContent).toBe('投**甲');
    expect(screen.queryByText('某某工程公司')).toBeNull();
    expect(screen.getByText('zhang_gong')).toBeTruthy();
    expect(screen.getByText('西湖区文三路100号维也纳酒店')).toBeTruthy();
    expect(screen.getByText('已完成设计，正在招投标')).toBeTruthy();
  });

  it('点击无效：选择原因后提交 reportShare', async () => {
    const { api } = await import('../src/api');
    api.opportunity.mockResolvedValue(makeDetail({
      isPurchased: true,
      marketIntelligence: {
        totalShares: 1,
        statusDistribution: { interested: 1 },
        shareBoard: [
          { shareId: 1, status: 'interested', summary: '甲方明确意向', helpfulCount: 3, createdAt: '2026-08-20T00:00:00.000Z', nickname: '投稿人乙', isOwn: false, isLiked: false, reportCount: 0, isReported: false },
        ],
      },
    }));
    api.reportShare.mockResolvedValue({});
    render(
      <MemoryRouter initialEntries={['/opportunity/25']}>
        <Routes>
          <Route path="/opportunity/:id" element={<OpportunityDetail />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('共享进度榜')).toBeTruthy());
    fireEvent.click(screen.getByText('无效'));
    await waitFor(() => expect(screen.getByText('举报无效情报')).toBeTruthy());
    fireEvent.click(screen.getByText('信息虚假'));
    fireEvent.click(screen.getAllByText('提交')[0]);
    await waitFor(() => expect(api.reportShare).toHaveBeenCalled());
    expect(api.reportShare).toHaveBeenCalledWith({ shareId: 1, reason: 'info_fake', reasonText: undefined });
  });

  it('共享进度超过 10 条时分页展示并支持查看更多', async () => {
    const { api } = await import('../src/api');
    const shares = Array.from({ length: 13 }, (_, i) => ({
      shareId: i + 1,
      status: 'interested',
      summary: `第 ${i + 1} 条情报`,
      helpfulCount: 0,
      createdAt: '2026-08-20T00:00:00.000Z',
      nickname: '投稿人乙',
      isOwn: false,
      isLiked: false,
      reportCount: 0,
      isReported: false,
    }));
    api.opportunity.mockResolvedValue(makeDetail({
      isPurchased: true,
      marketIntelligence: { totalShares: 13, statusDistribution: { interested: 13 }, shareBoard: shares },
    }));
    render(
      <MemoryRouter initialEntries={['/opportunity/25']}>
        <Routes>
          <Route path="/opportunity/:id" element={<OpportunityDetail />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('第 1 条情报')).toBeTruthy());
    expect(screen.queryByText('第 7 条情报')).toBeNull();
    expect(screen.getAllByText('无效').length).toBe(6);
    expect(screen.getByText('1/3')).toBeTruthy();
    expect(screen.getByText('下一页')).toBeTruthy();
    expect(screen.getByText('上一页').closest('button').disabled).toBe(true);
    fireEvent.click(screen.getByText('下一页'));
    await waitFor(() => expect(screen.getByText('第 7 条情报')).toBeTruthy());
    expect(screen.getByText('2/3')).toBeTruthy();
    expect(screen.getByText('上一页').closest('button').disabled).toBe(false);
    fireEvent.click(screen.getByText('下一页'));
    await waitFor(() => expect(screen.getByText('第 13 条情报')).toBeTruthy());
    expect(screen.getByText('3/3')).toBeTruthy();
    expect(screen.getByText('下一页').closest('button').disabled).toBe(true);
    fireEvent.click(screen.getByText('上一页'));
    await waitFor(() => expect(screen.getByText('2/3')).toBeTruthy());
  });

  it('点赞其他购买者的共享进度并携带 shareId', async () => {
    const { api } = await import('../src/api');
    api.opportunity.mockResolvedValue(makeDetail({
      isPurchased: true,
      marketIntelligence: {
        totalShares: 1,
        statusDistribution: { interested: 1 },
        shareBoard: [
          { shareId: 1, status: 'interested', summary: '甲方明确意向', helpfulCount: 3, createdAt: '2026-08-20T00:00:00.000Z', nickname: '投稿人乙', isOwn: false, isLiked: false, reportCount: 0, isReported: false },
        ],
      },
    }));
    api.markHelpful.mockResolvedValue({});
    render(
      <MemoryRouter initialEntries={['/opportunity/25']}>
        <Routes>
          <Route path="/opportunity/:id" element={<OpportunityDetail />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('甲方明确意向')).toBeTruthy());
    fireEvent.click(document.querySelector('.mi-like-btn'));
    await waitFor(() => expect(api.markHelpful).toHaveBeenCalled());
    expect(api.markHelpful).toHaveBeenCalledWith({ shareId: 1 });
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
    await waitFor(() => {
      expect(document.querySelector('.rv-dialog')).toBeNull();
      expect(document.querySelector('.rv-overlay')).toBeNull();
    }, { timeout: 5000 });
  });
});

describe('发布商机（开发需求 5.3 投稿上架 + 相似度检测）', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function fillStep1({ title = '弱电总包采购', price = '66', category = '装修总包' } = {}) {
    await waitFor(() => expect(screen.getByPlaceholderText('如：某酒店弱电总包采购')).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText('如：某酒店弱电总包采购'), { target: { value: title } });
    fireEvent.change(screen.getByPlaceholderText('如：某国际大酒店'), { target: { value: '维也纳酒店' } });
    fireEvent.change(screen.getByPlaceholderText('如：上海'), { target: { value: '杭州' } });
    fireEvent.change(screen.getByPlaceholderText('如：王经理'), { target: { value: '张经理' } });
    fireEvent.change(screen.getByPlaceholderText('如：13912345678'), { target: { value: '13900000001' } });
    fireEvent.change(screen.getByPlaceholderText('建议10-200积分'), { target: { value: price } });
    fireEvent.click(screen.getAllByPlaceholderText('请选择')[0]);
    await waitFor(() => expect(screen.getByText(category)).toBeTruthy());
    fireEvent.click(screen.getByText(category));
    await new Promise((r) => setTimeout(r, 200));
    fireEvent.click(screen.getAllByText('确认')[0]);
    await new Promise((r) => setTimeout(r, 100));
  }

  async function goStep2() {
    await fillStep1();
    fireEvent.click(screen.getByText('下一步'));
    await waitFor(() => expect(screen.getByPlaceholderText('如：已完成设计，正在招投标')).toBeTruthy());
  }

  it('渲染核心表单字段与提交按钮', async () => {
    render(
      <MemoryRouter>
        <Publish />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByPlaceholderText('如：某酒店弱电总包采购')).toBeTruthy());
    expect(screen.getByPlaceholderText('如：某国际大酒店')).toBeTruthy();
    expect(screen.getByPlaceholderText('如：上海')).toBeTruthy();
    expect(screen.getByPlaceholderText('如：13912345678')).toBeTruthy();
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
    await goStep2();
    expect(screen.getByPlaceholderText('如：已完成设计，正在招投标')).toBeTruthy();
    expect(screen.getByPlaceholderText('简要描述项目背景、规模与预期需求')).toBeTruthy();
    expect(screen.getByText('标签（最多5个）')).toBeTruthy();
    expect(screen.getByText('项目图纸（最多9个）')).toBeTruthy();
    expect(screen.getAllByText('发布商机').length).toBeGreaterThan(0);
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
    fireEvent.change(screen.getByPlaceholderText('如：某酒店弱电总包采购'), { target: { value: '测试商机' } });
    fireEvent.change(screen.getByPlaceholderText('建议10-200积分'), { target: { value: '88' } });
    fireEvent.click(screen.getByText('下一步'));
    await waitFor(() => expect(screen.queryByPlaceholderText('如：已完成设计，正在招投标')).toBeNull());
    expect(api.createOpportunity).not.toHaveBeenCalled();
  });

  it('缺少联系电话时被拦截（校验生效）', async () => {
    const { api } = await import('../src/api');
    api.createOpportunity.mockResolvedValue({});
    render(
      <MemoryRouter>
        <Publish />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByPlaceholderText('如：某酒店弱电总包采购')).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText('如：某酒店弱电总包采购'), { target: { value: '测试商机' } });
    fireEvent.change(screen.getByPlaceholderText('如：某国际大酒店'), { target: { value: '维也纳酒店' } });
    fireEvent.change(screen.getByPlaceholderText('如：上海'), { target: { value: '杭州' } });
    fireEvent.change(screen.getByPlaceholderText('如：王经理'), { target: { value: '张经理' } });
    fireEvent.change(screen.getByPlaceholderText('建议10-200积分'), { target: { value: '88' } });
    fireEvent.click(screen.getAllByPlaceholderText('请选择')[0]);
    await waitFor(() => expect(screen.getByText('装修总包')).toBeTruthy());
    fireEvent.click(screen.getByText('装修总包'));
    await new Promise((r) => setTimeout(r, 200));
    fireEvent.click(screen.getAllByText('确认')[0]);
    await new Promise((r) => setTimeout(r, 100));
    fireEvent.click(screen.getByText('下一步'));
    await waitFor(() => expect(screen.queryByPlaceholderText('如：已完成设计，正在招投标')).toBeNull());
    expect(api.createOpportunity).not.toHaveBeenCalled();
  });

  it('完整填写后调用 createOpportunity 并携带标题、数字价格、地址与微信号', async () => {
    const { api } = await import('../src/api');
    api.createOpportunity.mockResolvedValue({});
    render(
      <MemoryRouter>
        <Publish />
      </MemoryRouter>
    );
    await fillStep1({ title: '弱电总包采购', price: '66' });
    fireEvent.change(screen.getByPlaceholderText('如：上海市浦东新区世纪大道100号'), { target: { value: '世纪大道100号' } });
    fireEvent.change(screen.getByPlaceholderText('如：wang123'), { target: { value: 'zhang_jingli' } });
    fireEvent.click(screen.getByText('下一步'));
    await waitFor(() => expect(screen.getAllByText('发布商机').length).toBeGreaterThan(0));
    const pubBtns = screen.getAllByText('发布商机');
    fireEvent.click(pubBtns[pubBtns.length - 1]);
    await waitFor(() => expect(api.createOpportunity).toHaveBeenCalled());
    const payload = api.createOpportunity.mock.calls[0][0];
    expect(payload.title).toBe('弱电总包采购');
    expect(payload.price).toBe(66);
    expect(payload.categoryId).toBeTruthy();
    expect(payload.brand).toBe('维也纳酒店');
    expect(payload.city).toBe('杭州');
    expect(payload.address).toBe('世纪大道100号');
    expect(payload.wechat).toBe('zhang_jingli');
    expect(payload.contactName).toBe('张经理');
    expect(payload.contactPhone).toBe('13900000001');
  });

  it('相似度检测命中时展示相似商机提示', async () => {
    const { api } = await import('../src/api');
    api.createOpportunity.mockResolvedValue({
      similarOpportunities: [{ id: 3, title: '疑似相似商机' }],
    });
    render(
      <MemoryRouter>
        <Publish />
      </MemoryRouter>
    );
    await fillStep1({ title: '撞单测试', price: '88' });
    fireEvent.click(screen.getByText('下一步'));
    await waitFor(() => expect(screen.getAllByText('发布商机').length).toBeGreaterThan(0));
    const pubBtns = screen.getAllByText('发布商机');
    fireEvent.click(pubBtns[pubBtns.length - 1]);
    await waitFor(() => expect(screen.getByText('发现相似商机')).toBeTruthy());
    expect(screen.getByText('疑似相似商机')).toBeTruthy();
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
      ],
      total: 1,
    });
    api.myOrders.mockResolvedValue({
      list: [
        { id: 2, title: '我购买的单', status: 'active', price: 88, city: '杭州', isPurchased: true, isPublisher: false, purchaseCount: 12, createdAt: '2026-08-01T00:00:00.000Z' },
      ],
      total: 1,
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
    api.myOrders.mockResolvedValue({ list: [], total: 0 });
    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText(/暂无发布记录/)).toBeTruthy());
  });
});