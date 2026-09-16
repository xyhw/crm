import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

// 状态化存储 mock（setAuth 真正记录 token，供 getRefreshToken 返回）
const state = vi.hoisted(() => ({ token: '', refresh: '' }));

// mock 网络层与存储层（store 依赖）
vi.mock('@/common/request', () => ({
  request: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@/common/storage', () => ({
  getToken: vi.fn(() => state.token),
  getRefreshToken: vi.fn(() => state.refresh),
  setAuth: vi.fn((token, user, refresh) => {
    state.token = token || '';
    state.refresh = refresh || '';
  }),
  clearAuth: vi.fn(() => {
    state.token = '';
    state.refresh = '';
  }),
  getCachedUser: vi.fn(() => null),
}));

// mock uni 全局（reLaunch / login / storage）
global.uni = {
  reLaunch: vi.fn(),
  login: vi.fn(() => Promise.resolve({ code: 'wx-code' })),
  getStorageSync: vi.fn(() => ''),
  setStorageSync: vi.fn(),
  removeStorageSync: vi.fn(),
  showToast: vi.fn(),
};

import { request } from '@/common/request';
import { clearAuth } from '@/common/storage';
import { useUserStore } from '@/store/user';

describe('user store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    state.token = '';
    state.refresh = '';
  });

  it('setLogin 保存 token 并写入 storage', () => {
    const store = useUserStore();
    store.setLogin('tok-abc', { id: 1, nickname: '张三' }, 'ref-abc');
    expect(store.token).toBe('tok-abc');
    expect(store.user.nickname).toBe('张三');
    expect(store.isAuthenticated).toBe(true);
  });

  it('logout 调用服务端吊销接口（带 refreshToken），随后清本地并跳登录页', async () => {
    const store = useUserStore();
    store.setLogin('tok-abc', { id: 1 }, 'ref-abc');

    store.logout();

    // 服务端吊销被调用（fire-and-forget，等一个微任务）
    await Promise.resolve();
    await Promise.resolve();
    expect(request).toHaveBeenCalledWith(
      '/auth/logout',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ refreshToken: 'ref-abc' }),
      })
    );
    expect(clearAuth).toHaveBeenCalled();
    expect(uni.reLaunch).toHaveBeenCalledWith({ url: '/pages/login/index' });
    expect(store.token).toBe('');
    expect(store.isAuthenticated).toBe(false);
  });

  it('logout 时服务端吊销失败不阻塞本地清理', async () => {
    const store = useUserStore();
    store.setLogin('tok-abc', { id: 1 }, 'ref-abc');
    request.mockImplementation(() => Promise.reject(new Error('network down')));

    expect(() => store.logout()).not.toThrow();
    expect(store.token).toBe('');
    expect(clearAuth).toHaveBeenCalled();
    expect(uni.reLaunch).toHaveBeenCalled();
  });
});
