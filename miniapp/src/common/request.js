import { API_BASE, REQUEST_TIMEOUT } from './config';
import { getToken, getRefreshToken, setTokenAndRefresh, clearAuth, getCachedUser } from './storage';

const MAX_RETRIES = 1;
const RETRY_DELAY = 600;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function req(options) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: API_BASE + options.path,
      method: options.method || 'GET',
      data: options.body,
      header: options.headers || {},
      timeout: REQUEST_TIMEOUT,
      success: (res) => {
        resolve({ statusCode: res.statusCode, data: res.data });
      },
      fail: (err) => {
        reject(new Error('网络异常，请稍后重试'));
      },
    });
  });
}

async function tryRefreshToken() {
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    const res = await req({
      path: '/auth/refresh',
      method: 'POST',
      body: { refreshToken },
    });
    const json = res.data;
    if (json.code === 0 && json.data?.token) {
      setTokenAndRefresh(json.data.token, json.data.refreshToken);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

function toQuery(params) {
  if (!params) return '';
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? '?' + parts.join('&') : '';
}

export function buildQuery(params) {
  return toQuery(params);
}

/**
 * 统一请求入口，与 client/src/api/index.js 的 request 逻辑对齐：
 * - 自动携带 Authorization Bearer token
 * - code===401 时用 refreshToken 刷新后重放
 * - GET 网络异常 / 5xx 自动重试一次
 * @param {string} path 以 / 开头的接口路径
 * @param {object} opts { method, body, auth }
 * @returns {Promise<any>} code===0 时的 data
 */
export async function request(path, opts = {}) {
  const { method = 'GET', body, auth = true } = opts;
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let resp;
  try {
    resp = await req({ path, method, body, headers });
  } catch (e) {
    if (method === 'GET') {
      // 网络异常 GET 重试一次
      await delay(RETRY_DELAY);
      try {
        resp = await req({ path, method, body, headers });
      } catch (e2) {
        throw new Error('网络异常，请稍后重试');
      }
    } else {
      throw new Error('网络异常，请稍后重试');
    }
  }

  let json = resp.data;
  if (typeof json !== 'object' || json === null) {
    throw new Error('服务器响应异常');
  }

  // token 过期，尝试刷新
  if (json.code === 401 && auth && getRefreshToken()) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers.Authorization = `Bearer ${getToken()}`;
      const retryResp = await req({ path, method, body, headers });
      json = retryResp.data;
    } else {
      clearAuth();
      redirectToLogin();
      throw new Error(json.message || '请先登录');
    }
  } else if (json.code === 401) {
    clearAuth();
    redirectToLogin();
    throw new Error(json.message || '请先登录');
  }

  if (json.code !== 0) {
    // 5xx GET 重试一次
    if (method === 'GET' && resp.statusCode >= 500) {
      await delay(RETRY_DELAY);
      try {
        const retryResp = await req({ path, method, body, headers });
        json = retryResp.data;
        if (json.code === 0) return json.data;
      } catch (e) {
        /* ignore */
      }
    }
    const err = new Error(json.message || '请求失败');
    err.code = json.code;
    throw err;
  }
  return json.data;
}

export function redirectToLogin() {
  // 页面栈操作需在页面上下文，这里仅做标记；由 store 或页面跳转逻辑消费
  uni.reLaunch({
    url: '/pages/login/index',
  });
}

export function getCachedUserForCheck() {
  return getCachedUser();
}

export function toLogin() {
  uni.reLaunch({ url: '/pages/login/index' });
}