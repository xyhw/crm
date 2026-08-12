// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import Profile from '../src/pages/Profile';
import ProfileEdit from '../src/pages/ProfileEdit';

vi.mock('../src/api', () => ({
  api: {
    myStats: vi.fn(),
    updateMe: vi.fn(),
    me: vi.fn().mockResolvedValue({ nickname: '测试' }),
  },
}));

const updateUserMock = vi.fn();

vi.mock('../src/context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    AuthProvider: ({ children }) => <React.Fragment>{children}</React.Fragment>,
    useAuth: () => ({
      user: {
        id: 1,
        nickname: '测试供应商',
        phone: '13800000001',
        pointsBalance: 666,
        level: 'gold',
        creditScore: 88,
        company: '测试装修公司',
        category: 'decoration',
        email: 't@t.com',
        qualifications: '一级装修资质\nISO9001认证',
        cases: '某五星酒店弱电总包\n某连锁酒店软装项目',
      },
      token: 'test-token',
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn().mockResolvedValue({}),
      updateUser: updateUserMock,
    }),
  };
});

describe('个人中心 Profile（开发需求 6.1.1）', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('展示用户卡片：昵称/等级/信用分/积分', async () => {
    const { api } = await import('../src/api');
    api.myStats.mockResolvedValue({ published: 3, crm: 5, totalPurchased: 12, totalIncome: 200 });
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('测试供应商')).toBeTruthy());
    expect(screen.getByText('666')).toBeTruthy();
    expect(screen.getByText('88')).toBeTruthy();
  });

  it('展示公司/类型/邮箱身份信息', async () => {
    const { api } = await import('../src/api');
    api.myStats.mockResolvedValue({});
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('测试装修公司')).toBeTruthy());
    expect(screen.getByText('t@t.com')).toBeTruthy();
  });

  it('展示专业资质与典型案例（换行分隔）', async () => {
    const { api } = await import('../src/api');
    api.myStats.mockResolvedValue({});
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('专业资质')).toBeTruthy());
    expect(screen.getByText('一级装修资质')).toBeTruthy();
    expect(screen.getByText('ISO9001认证')).toBeTruthy();
    expect(screen.getByText('典型案例')).toBeTruthy();
    expect(screen.getByText('某五星酒店弱电总包')).toBeTruthy();
  });

  it('展示数据统计：投稿/CRM/被购买/总收入', async () => {
    const { api } = await import('../src/api');
    api.myStats.mockResolvedValue({ published: 3, crm: 5, totalPurchased: 12, totalIncome: 200 });
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('3')).toBeTruthy());
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('200')).toBeTruthy();
  });

  it('功能列表包含核心入口', async () => {
    const { api } = await import('../src/api');
    api.myStats.mockResolvedValue({});
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('编辑资料')).toBeTruthy());
    expect(screen.getByText('退出登录')).toBeTruthy();
    expect(screen.getByText('用户协议')).toBeTruthy();
    expect(screen.getByText('隐私政策')).toBeTruthy();
  });
});

describe('编辑资料 ProfileEdit', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染表单字段并预填昵称', async () => {
    render(
      <MemoryRouter>
        <ProfileEdit />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('编辑资料')).toBeTruthy());
    expect(screen.getByPlaceholderText('请输入昵称')).toBeTruthy();
    expect(screen.getByPlaceholderText('公司名称')).toBeTruthy();
    expect(screen.getByText('供应商类型')).toBeTruthy();
    expect(screen.getByText('保存')).toBeTruthy();
  });

  it('提交保存调用 updateMe 并同步 updateUser', async () => {
    const { api } = await import('../src/api');
    api.updateMe.mockResolvedValue({ nickname: '新昵称', company: '新公司' });
    render(
      <MemoryRouter>
        <ProfileEdit />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByPlaceholderText('请输入昵称')).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText('请输入昵称'), { target: { value: '新昵称' } });
    fireEvent.change(screen.getByPlaceholderText('公司名称'), { target: { value: '新公司' } });
    fireEvent.click(screen.getByText('保存'));
    await waitFor(() => expect(api.updateMe).toHaveBeenCalled());
    expect(updateUserMock).toHaveBeenCalled();
  });
});