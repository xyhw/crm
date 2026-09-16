import { describe, it, expect, vi, beforeEach } from 'vitest';

// 状态化 uni mock：内存 storage + 可编排的 uni.request 响应队列
const storageMap = new Map();
let requestQueue = [];
let requestCalls = [];

global.uni = {
  request: vi.fn((options) => {
    requestCalls.push(options);
    const next = requestQueue.shift();
    setTimeout(() => {
      if (!next) return;
      if (next.fail) options.fail({ errMsg: 'request:fail' });
      else options.success({ statusCode: next.statusCode ?? 200, data: next.data });
    }, 0);
  }),
  reLaunch: vi.fn(),
  getStorageSync: vi.fn((k) => storageMap.get(k) ?? ''),
  setStorageSync: vi.fn((k, v) => storageMap.set(k, v)),
  removeStorageSync: vi.fn((k) => storageMap.delete(k)),
  showToast: vi.fn(),
};

import { request, buildQuery, redirectToLogin } from '@/common/request';

const ok = (data) => ({ statusCode: 200, data: { code: 0, data } });
const errCode = (code, message) => ({ statusCode: 200, data: { code, message } });

describe('buildQuery', () => {
  it('过滤 undefined/null/空串并编码', () => {
    expect(buildQuery({ a: 1, b: undefined, c: null, d: '', e: '中 文' })).toBe('?a=1&e=%E4%B8%AD%20%E6%96%87');
  });

  it('空参数返回空串', () => {
    expect(buildQuery()).toBe('');
    expect(buildQuery({})).toBe('');
    expect(buildQuery({ a: undefined })).toBe('');
  });
});

describe('request 网络层', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMap.clear();
    requestQueue = [];
    requestCalls = [];
  });

  it('code 0 时解析 data 并自动携带 Bearer token', async () => {
    storageMap.set('hof_token', 'tok-1');
    requestQueue.push(ok({ points: 100 }));
    const data = await request('/points/balance');
    expect(data).toEqual({ points: 100 });
    expect(requestCalls[0].header.Authorization).toBe('Bearer tok-1');
    expect(requestCalls[0].url).toContain('/points/balance');
  });

  it('401 + refreshToken：刷新成功后用新 token 重放原请求', async () => {
    storageMap.set('hof_token', 'old-tok');
    storageMap.set('hof_refresh_token', 'old-ref');
    requestQueue.push(
      errCode(401, '未登录'),
      ok({ token: 'new-tok', refreshToken: 'new-ref' }), // /auth/refresh
      ok({ points: 7 }) // 重放
    );
    const data = await request('/points/balance');
    expect(data).toEqual({ points: 7 });
    // 重放请求应带新 token
    expect(requestCalls[2].header.Authorization).toBe('Bearer new-tok');
    // 新 token 已落 storage
    expect(storageMap.get('hof_token')).toBe('new-tok');
  });

  it('401 + 刷新失败：清登录态并跳登录页，抛出错误', async () => {
    storageMap.set('hof_token', 'old-tok');
    storageMap.set('hof_refresh_token', 'old-ref');
    requestQueue.push(errCode(401, '未登录'), errCode(401, 'refreshToken 无效'));
    await expect(request('/points/balance')).rejects.toThrow('未登录');
    expect(storageMap.get('hof_token')).toBeUndefined();
    expect(uni.reLaunch).toHaveBeenCalledWith({ url: '/pages/login/index' });
  });

  it('401 且无 refreshToken：直接清登录态', async () => {
    requestQueue.push(errCode(401, '未登录'));
    await expect(request('/points/balance')).rejects.toThrow();
    expect(uni.reLaunch).toHaveBeenCalled();
    // 不应尝试刷新（只有 1 次请求）
    expect(requestCalls).toHaveLength(1);
  });

  it('GET 网络异常自动重试一次，两次都失败才抛错', async () => {
    requestQueue.push({ fail: true }, { fail: true });
    await expect(request('/opportunities')).rejects.toThrow('网络异常，请稍后重试');
    expect(requestCalls).toHaveLength(2);
  });

  it('POST 网络异常不重试', async () => {
    requestQueue.push({ fail: true });
    await expect(request('/orders', { method: 'POST', body: {} })).rejects.toThrow('网络异常，请稍后重试');
    expect(requestCalls).toHaveLength(1);
  });

  it('业务错误码透传（err.code）', async () => {
    requestQueue.push(errCode(400, '密码至少 8 位'));
    const err = await request('/auth/register', { method: 'POST', body: {} }).catch((e) => e);
    expect(err.code).toBe(400);
    expect(err.message).toBe('密码至少 8 位');
  });

  it('GET 5xx 自动重试一次并成功', async () => {
    requestQueue.push({ statusCode: 500, data: { code: 500, message: '服务器错误' } }, ok({ id: 3 }));
    const data = await request('/opportunities/3');
    expect(data).toEqual({ id: 3 });
    expect(requestCalls).toHaveLength(2);
  });

  it('非对象响应体抛服务器响应异常', async () => {
    requestQueue.push({ statusCode: 200, data: 'not-json' });
    await expect(request('/points/balance')).rejects.toThrow('服务器响应异常');
  });

  it('redirectToLogin 跳转登录页', () => {
    redirectToLogin();
    expect(uni.reLaunch).toHaveBeenCalledWith({ url: '/pages/login/index' });
  });
});
