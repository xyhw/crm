// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import Login from '../src/pages/Login';
import Register from '../src/pages/Register';
import ForgotPassword from '../src/pages/ForgotPassword';

vi.mock('../src/api', () => ({
  api: {
    register: vi.fn(),
    resetPassword: vi.fn(),
    sendResetCode: vi.fn(),
    me: vi.fn().mockResolvedValue({ id: 1, nickname: '测试', phone: '13800000001' }),
  },
}));

const loginMock = vi.fn().mockResolvedValue({ token: 't', user: { nickname: '测试' } });
const registerAuthMock = vi.fn().mockResolvedValue({ token: 't', user: {} });

vi.mock('../src/context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    AuthProvider: ({ children }) => <React.Fragment>{children}</React.Fragment>,
    useAuth: () => ({
      user: { id: 1, nickname: '测试', phone: '13800000001', pointsBalance: 100 },
      token: 'test-token',
      isAuthenticated: true,
      login: loginMock,
      register: registerAuthMock,
      logout: vi.fn(),
      refreshUser: vi.fn().mockResolvedValue({}),
      updateUser: vi.fn(),
    }),
  };
});

describe('认证页面（开发需求 6.1.1）', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('登录页渲染关键元素：logo/手机号/密码/协议链接', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    expect(screen.getByText('商机互助')).toBeTruthy();
    expect(screen.getByText('酒店供应链供应商互助平台')).toBeTruthy();
    expect(screen.getByPlaceholderText('请输入手机号')).toBeTruthy();
    expect(screen.getByPlaceholderText('请输入密码')).toBeTruthy();
    expect(screen.getByText('忘记密码')).toBeTruthy();
    expect(screen.getByText('《用户协议》')).toBeTruthy();
    expect(screen.getByText('《隐私政策》')).toBeTruthy();
  });

  it('登录表单提交正确调用 login 并携带手机号密码', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText('请输入手机号'), { target: { value: '13800000001' } });
    fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('登录'));
    await waitFor(() => expect(loginMock).toHaveBeenCalled());
    expect(loginMock).toHaveBeenCalledWith({ phone: '13800000001', password: '123456' });
  });

  it('注册页渲染核心字段：手机号/昵称/邮箱/公司/密码', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );
    expect(screen.getByText('注册账号')).toBeTruthy();
    expect(screen.getByPlaceholderText('请输入手机号')).toBeTruthy();
    expect(screen.getByPlaceholderText('如：装修张工')).toBeTruthy();
    expect(screen.getByPlaceholderText('用于找回密码')).toBeTruthy();
    expect(screen.getByPlaceholderText('公司名称（选填）')).toBeTruthy();
    expect(screen.getByPlaceholderText('至少 6 位密码')).toBeTruthy();
  });

  it('注册提交调用 register 且 content 含公司信息', async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );
    fireEvent.change(screen.getAllByPlaceholderText('请输入手机号')[0], { target: { value: '13900000001' } });
    fireEvent.change(screen.getByPlaceholderText('如：装修张工'), { target: { value: '测试供应商' } });
    fireEvent.change(screen.getByPlaceholderText('用于找回密码'), { target: { value: 't@t.com' } });
    fireEvent.change(screen.getByPlaceholderText('公司名称（选填）'), { target: { value: '测试装修公司' } });
    fireEvent.change(screen.getByPlaceholderText('至少 6 位密码'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('注册'));
    await waitFor(() => expect(registerAuthMock).toHaveBeenCalled());
    const submitted = registerAuthMock.mock.calls[0][0];
    expect(submitted.phone).toBe('13900000001');
    expect(submitted.nickname).toBe('测试供应商');
    expect(submitted.company).toBe('测试装修公司');
  });

  it('找回密码页渲染邮箱/验证码/新密码并提交 resetPassword', async () => {
    const { api } = await import('../src/api');
    api.resetPassword.mockResolvedValue({ code: 0 });
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );
    expect(screen.getByText('找回密码')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('请输入注册邮箱'), { target: { value: 'test1@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('请输入邮箱收到的验证码'), { target: { value: '123456' } });
    fireEvent.change(screen.getByPlaceholderText('请输入新密码（至少6位）'), { target: { value: 'newpass123' } });
    fireEvent.click(screen.getByText('重置密码'));
    await waitFor(() => expect(api.resetPassword).toHaveBeenCalledWith({
      email: 'test1@example.com',
      code: '123456',
      newPassword: 'newpass123',
    }));
  });

  it('获取验证码按钮触发 sendResetCode', async () => {
    const { api } = await import('../src/api');
    api.sendResetCode.mockResolvedValue({ code: 0 });
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText('请输入注册邮箱'), { target: { value: 'test1@example.com' } });
    fireEvent.click(screen.getByText('获取验证码'));
    await waitFor(() => expect(api.sendResetCode).toHaveBeenCalledWith({ email: 'test1@example.com' }));
  });
});