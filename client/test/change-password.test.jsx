// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import ChangePassword from '../src/pages/ChangePassword';

vi.mock('../src/api', () => ({
  api: {
    changePassword: vi.fn(),
  },
}));

const logoutMock = vi.fn();

vi.mock('../src/context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    AuthProvider: ({ children }) => <React.Fragment>{children}</React.Fragment>,
    useAuth: () => ({
      user: { id: 1, nickname: '测试' },
      token: 'test-token',
      isAuthenticated: true,
      logout: logoutMock,
    }),
  };
});

describe('账号安全 修改密码 ChangePassword', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染三个密码字段与提交按钮', async () => {
    render(
      <MemoryRouter>
        <ChangePassword />
      </MemoryRouter>
    );
    expect(screen.getByText('账号安全')).toBeTruthy();
    expect(screen.getByPlaceholderText('请输入当前密码')).toBeTruthy();
    expect(screen.getByPlaceholderText('请输入新密码（至少6位）')).toBeTruthy();
    expect(screen.getByPlaceholderText('请再次输入新密码')).toBeTruthy();
    expect(screen.getByText('确认修改')).toBeTruthy();
  });

  it('两次新密码不一致时不调用 changePassword', async () => {
    const { api } = await import('../src/api');
    render(
      <MemoryRouter>
        <ChangePassword />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText('请输入当前密码'), { target: { value: 'oldpass123' } });
    fireEvent.change(screen.getByPlaceholderText('请输入新密码（至少6位）'), { target: { value: 'newpass123' } });
    fireEvent.change(screen.getByPlaceholderText('请再次输入新密码'), { target: { value: 'different' } });
    fireEvent.click(screen.getByText('确认修改'));
    await waitFor(() => expect(api.changePassword).not.toHaveBeenCalled());
  });

  it('提交成功调用 changePassword 并登出跳转登录页', async () => {
    const { api } = await import('../src/api');
    api.changePassword.mockResolvedValue({});
    render(
      <MemoryRouter>
        <ChangePassword />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText('请输入当前密码'), { target: { value: 'oldpass123' } });
    fireEvent.change(screen.getByPlaceholderText('请输入新密码（至少6位）'), { target: { value: 'newpass123' } });
    fireEvent.change(screen.getByPlaceholderText('请再次输入新密码'), { target: { value: 'newpass123' } });
    fireEvent.click(screen.getByText('确认修改'));
    await waitFor(() => expect(api.changePassword).toHaveBeenCalledWith({
      oldPassword: 'oldpass123',
      newPassword: 'newpass123',
    }));
    await waitFor(() => expect(logoutMock).toHaveBeenCalled());
  });

  it('显示/隐藏密码切换输入类型', async () => {
    render(
      <MemoryRouter>
        <ChangePassword />
      </MemoryRouter>
    );
    const oldInput = screen.getByPlaceholderText('请输入当前密码');
    expect(oldInput.getAttribute('type')).toBe('password');
    fireEvent.click(screen.getByText('显示密码'));
    expect(oldInput.getAttribute('type')).toBe('text');
    fireEvent.click(screen.getByText('隐藏密码'));
    expect(oldInput.getAttribute('type')).toBe('password');
  });
});
