// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';
import CRM from '../src/pages/CRM';
import CRMDetail from '../src/pages/CRMDetail';

vi.mock('../src/api', () => ({
  api: {
    crmList: vi.fn(),
    crmDetail: vi.fn(),
    addFollowUp: vi.fn(),
    shareFollowUp: vi.fn(),
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

describe('个人 CRM 列表（开发需求 6.1.4）', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染商机卡片：标题/城市/酒店/分类/状态标签/跟进次数', async () => {
    const { api } = await import('../src/api');
    api.crmList.mockResolvedValue({
      list: [
        {
          id: 25,
          title: '某酒店装修项目',
          city: '杭州',
          hotel_name: '维也纳酒店',
          category_name: '装修总包',
          status: 'following',
          follow_up_count: 3,
          next_follow_date: '2026-08-20',
          category_icon: '🏗',
        },
      ],
      total: 1,
    });
    render(
      <MemoryRouter>
        <CRM />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('某酒店装修项目')).toBeTruthy());
    expect(screen.getByText('杭州')).toBeTruthy();
    expect(screen.getByText('维也纳酒店')).toBeTruthy();
    expect(screen.getByText('装修总包')).toBeTruthy();
    expect(screen.getAllByText('跟进中').length).toBeGreaterThan(0);
    expect(screen.getByText('3 次跟进')).toBeTruthy();
    expect(screen.getByText(/下次跟进/)).toBeTruthy();
  });

  it('切换状态 Tab 会以对应状态重新拉取列表', async () => {
    const { api } = await import('../src/api');
    api.crmList.mockResolvedValue({ list: [], total: 0 });
    render(
      <MemoryRouter>
        <CRM />
      </MemoryRouter>
    );
    await waitFor(() => expect(api.crmList).toHaveBeenCalled());
    fireEvent.click(screen.getByText('已成交'));
    await waitFor(() => {
      const lastCall = api.crmList.mock.calls[api.crmList.mock.calls.length - 1][0];
      return expect(lastCall.status).toBe('closed');
    });
  });

  it('空数据展示空态', async () => {
    const { api } = await import('../src/api');
    api.crmList.mockResolvedValue({ list: [], total: 0 });
    render(
      <MemoryRouter>
        <CRM />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('暂无CRM商机')).toBeTruthy());
  });
});

describe('CRM 详情（开发需求 5.8 跟进记录 + 共享进度）', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeCrm = (over = {}) => ({
    id: 25,
    title: '某酒店装修项目',
    city: '杭州',
    hotel_name: '维也纳酒店',
    category_name: '装修总包',
    status: 'following',
    source: 'purchased',
    contact_name: '张工',
    contact_phone: '13800000001',
    opportunity_id: 9,
    followUps: [
      { id: 1, status: 'interested', content_private: '客户很感兴趣，约了下周面谈', created_at: '2026-08-01', next_follow_date: '2026-08-10' },
    ],
    ...over,
  });

  it('展示基本信息/联系方式/跟进记录时间线', async () => {
    const { api } = await import('../src/api');
    api.crmDetail.mockResolvedValue(makeCrm());
    render(
      <MemoryRouter initialEntries={['/crm/25']}>
        <Routes>
          <Route path="/crm/:id" element={<CRMDetail />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('某酒店装修项目')).toBeTruthy());
    expect(screen.getByText('杭州')).toBeTruthy();
    expect(screen.getByText('购买入库')).toBeTruthy();
    expect(screen.getByText('张工')).toBeTruthy();
    expect(screen.getByText('13800000001')).toBeTruthy();
    expect(screen.getByText('客户很感兴趣，约了下周面谈')).toBeTruthy();
    expect(screen.getByText('新增跟进')).toBeTruthy();
    expect(screen.getAllByText('共享进度')[0]).toBeTruthy();
  });

  it('手动录入来源不展示联系方式', async () => {
    const { api } = await import('../src/api');
    api.crmDetail.mockResolvedValue(makeCrm({ source: 'manual', contact_name: '', contact_phone: '' }));
    render(
      <MemoryRouter initialEntries={['/crm/25']}>
        <Routes>
          <Route path="/crm/:id" element={<CRMDetail />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('手动录入')).toBeTruthy());
    expect(screen.getByText('手动录入')).toBeTruthy();
    expect(screen.queryByText('13800000001')).toBeNull();
  });

  it('新增跟进：填写内容后提交 addFollowUp 携带 CRM id 与状态', async () => {
    const { api } = await import('../src/api');
    api.crmDetail.mockResolvedValue(makeCrm());
    api.addFollowUp.mockResolvedValue({});
    render(
      <MemoryRouter initialEntries={['/crm/25']}>
        <Routes>
          <Route path="/crm/:id" element={<CRMDetail />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('新增跟进')).toBeTruthy());
    fireEvent.click(screen.getByText('新增跟进'));
    await waitFor(() => expect(screen.getByText('新增跟进记录')).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText('记录本次跟进的详细内容'), { target: { value: '电话联系客户确认意向' } });
    fireEvent.click(screen.getAllByText('确认')[0]);
    await waitFor(() => expect(api.addFollowUp).toHaveBeenCalled());
    expect(api.addFollowUp).toHaveBeenCalledWith({
      crmOpportunityId: 25,
      status: 'call_no_answer',
      contentPrivate: '电话联系客户确认意向',
      nextFollowDate: undefined,
    });
  });

  it('跟进记录超过 6 条时展示分页', async () => {
    const { api } = await import('../src/api');
    const manyFollowUps = Array.from({ length: 7 }, (_, i) => ({
      id: i + 1,
      status: 'interested',
      content_private: `第 ${i + 1} 次跟进记录内容`,
      created_at: '2026-08-20',
      next_follow_date: null,
    }));
    api.crmDetail.mockResolvedValue(makeCrm({ followUps: manyFollowUps }));
    render(
      <MemoryRouter initialEntries={['/crm/25']}>
        <Routes>
          <Route path="/crm/:id" element={<CRMDetail />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('第 1 次跟进记录内容')).toBeTruthy());
    expect(screen.queryByText('第 7 次跟进记录内容')).toBeNull();
    expect(screen.getByText('1/2')).toBeTruthy();
    expect(screen.getByText('下一页').closest('button').disabled).toBe(false);
    fireEvent.click(screen.getByText('下一页'));
    await waitFor(() => expect(screen.getByText('第 7 次跟进记录内容')).toBeTruthy());
    expect(screen.getByText('2/2')).toBeTruthy();
    expect(screen.getByText('下一页').closest('button').disabled).toBe(true);
  });

  it('共享进度：填写摘要后提交 shareFollowUp', async () => {
    const { api } = await import('../src/api');
    api.crmDetail.mockResolvedValue(makeCrm());
    api.shareFollowUp.mockResolvedValue({});
    render(
      <MemoryRouter initialEntries={['/crm/25']}>
        <Routes>
          <Route path="/crm/:id" element={<CRMDetail />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getAllByText('共享进度')[0]).toBeTruthy());
    fireEvent.click(screen.getAllByText('共享进度').pop());
    await waitFor(() => expect(screen.getByText(/匿名展示/)).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText('一句话描述进度（匿名展示）'), { target: { value: '已初步接触，对方态度积极' } });
    fireEvent.click(screen.getAllByText('确认')[0]);
    await waitFor(() => expect(api.shareFollowUp).toHaveBeenCalled());
    expect(api.shareFollowUp).toHaveBeenCalledWith({
      opportunityId: 9,
      status: 'call_no_answer',
      summary: '已初步接触，对方态度积极',
    });
  });
});