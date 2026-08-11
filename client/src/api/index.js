const BASE = '/api';
const TOKEN_KEY = 'hof_token';
const USER_KEY = 'hof_user';
const REFRESH_KEY = 'hof_refresh_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY) || '';
}

export function setAuth(token, user, refreshToken) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function getCachedUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const resp = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let json;
  try {
    json = await resp.json();
  } catch {
    throw new Error('服务器响应异常');
  }

  // Token 过期，尝试刷新
  if (json.code === 401 && auth && getRefreshToken()) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers.Authorization = `Bearer ${getToken()}`;
      const retryResp = await fetch(BASE + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      json = await retryResp.json();
    } else {
      clearAuth();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new Error(json.message || '请先登录');
    }
  } else if (json.code === 401) {
    clearAuth();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error(json.message || '请先登录');
  }

  if (json.code !== 0) {
    const err = new Error(json.message || '请求失败');
    err.code = json.code;
    throw err;
  }
  return json.data;
}

async function tryRefreshToken() {
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    const resp = await fetch(BASE + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const json = await resp.json();

    if (json.code === 0 && json.data?.token) {
      localStorage.setItem(TOKEN_KEY, json.data.token);
      if (json.data.refreshToken) {
        localStorage.setItem(REFRESH_KEY, json.data.refreshToken);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function qs(params) {
  if (!params) return '';
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? '?' + parts.join('&') : '';
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),

  // 认证
  login: (data) => request('/auth/login', { method: 'POST', body: data, auth: false }),
  register: (data) => request('/auth/register', { method: 'POST', body: data, auth: false }),
  resetPassword: (data) => request('/auth/reset-password', { method: 'POST', body: data, auth: false }),
  me: () => request('/auth/me'),
  updateMe: (data) => request('/auth/me', { method: 'PUT', body: data }),

  // 跟单
  opportunities: (params) => request('/opportunities' + qs(params)),
  opportunity: (id) => request('/opportunities/' + id),
  createOpportunity: (data) => request('/opportunities', { method: 'POST', body: data }),
  markInvalid: (id, data) => request('/opportunities/' + id + '/invalid-mark', { method: 'POST', body: data }),

  // 购买
  purchase: (data) => request('/orders', { method: 'POST', body: data }),
  myOrders: (params) => request('/orders/my' + qs(params)),

  // 积分
  pointsBalance: () => request('/points/balance'),
  pointsLogs: (params) => request('/points/logs' + qs(params)),
  recharge: (data) => request('/points/recharge', { method: 'POST', body: data }),

  // CRM
  crmList: (params) => request('/crm' + qs(params)),
  crmDetail: (id) => request('/crm/' + id),
  crmAdd: (data) => request('/crm', { method: 'POST', body: data }),
  crmPublish: (id, data) => request('/crm/' + id + '/publish', { method: 'POST', body: data }),

  // 跟进
  followUps: (crmId) => request('/follow-ups/' + crmId),
  addFollowUp: (data) => request('/follow-ups', { method: 'POST', body: data }),
  shareFollowUp: (data) => request('/follow-ups/share', { method: 'POST', body: data }),
  markHelpful: (data) => request('/follow-ups/helpful', { method: 'POST', body: data }),

  // 邀请
  invitationMe: () => request('/invitations/me'),

  // Banner
  banners: () => request('/banners'),

  // 排行榜
  rankings: (params) => request('/rankings' + qs(params)),

  // 通知
  notifications: (params) => request('/notifications' + qs(params)),
  markNotificationRead: (id) => request('/notifications/' + id + '/read', { method: 'PUT' }),
  markAllRead: () => request('/notifications/read-all', { method: 'PUT' }),

  // 提醒
  reminders: (params) => request('/reminders' + qs(params)),

  // 信用分
  credits: (params) => request('/credits' + qs(params)),

  // 统计
  myStats: () => request('/stats/me'),

  // 协议（公开接口）
  agreement: (type) => request('/agreement/' + type, { auth: false }),
};
