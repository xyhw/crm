const TOKEN_KEY = 'hof_admin_token';
const USER_KEY = 'hof_admin_user';

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setAdminAuth(token, admin) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (admin) localStorage.setItem(USER_KEY, JSON.stringify(admin));
}

export function getAdminUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAdminAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function toQuery(params) {
  if (!params) return '';
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

async function parseJson(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('服务器响应异常');
  }
}

export async function adminRequest(path, opts = {}) {
  const { method = 'GET', body, auth = true } = opts;
  const headers = {};
  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getAdminToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`/api/v1/admin${path}`, {
      method,
      headers,
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('网络异常，请稍后重试');
  }

  const json = await parseJson(res);
  if (typeof json !== 'object' || json === null) {
    throw new Error('服务器响应异常');
  }

  if (json.code === 401) {
    clearAdminAuth();
    if (window.location.hash !== '#/login') {
      window.location.hash = '#/login';
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

export function adminBuildQuery(params) {
  return toQuery(params);
}

export const adminApi = {
  login: (data) => adminRequest('/auth/login', { method: 'POST', body: data, auth: false }),
  getMe: () => adminRequest('/auth/me'),
  changePassword: (data) => adminRequest('/auth/password', { method: 'PUT', body: data }),

  getDashboard: () => adminRequest('/stats/dashboard'),
  getTrends: () => adminRequest('/stats/trends'),
  getDistribution: () => adminRequest('/stats/distribution'),

  getOpportunities: (params) => adminRequest(`/opportunities${toQuery(params)}`),
  getOpportunityDetail: (id) => adminRequest(`/opportunities/${id}`),
  updateOpportunity: (id, data) => adminRequest(`/opportunities/${id}/status`, { method: 'PUT', body: data }),

  getUsers: (params) => adminRequest(`/users${toQuery(params)}`),
  getUserDetail: (id) => adminRequest(`/users/${id}`),
  updateUser: (id, data) => adminRequest(`/users/${id}`, { method: 'PUT', body: data }),
  adjustPoints: (id, data) => adminRequest(`/users/${id}/points`, { method: 'PUT', body: data }),
  adjustCredit: (id, data) => adminRequest(`/users/${id}/credit`, { method: 'PUT', body: data }),

  getOrders: (params) => adminRequest(`/orders${toQuery(params)}`),

  getPointsLogs: (params) => adminRequest(`/points${toQuery(params)}`),

  getRechargeOrders: (params) => adminRequest(`/recharge-orders${toQuery(params)}`),
  getRechargeSummary: () => adminRequest('/recharge-orders/summary'),
  syncRechargeOrder: (orderNo) => adminRequest(`/recharge-orders/${orderNo}/sync`, { method: 'POST' }),
  refundRechargeOrder: (orderNo, data) =>
    adminRequest(`/recharge-orders/${orderNo}/refund`, { method: 'POST', body: data }),

  getLevels: () => adminRequest('/levels'),
  updateLevel: (id, data) => adminRequest(`/levels/${id}`, { method: 'PUT', body: data }),

  getConfigs: () => adminRequest('/configs'),
  updateConfig: (data) => adminRequest('/configs', { method: 'PUT', body: data }),

  getAuditList: (params) => adminRequest(`/audit/follow-up-shares${toQuery(params)}`),
  auditFollowUp: (id, data) => adminRequest(`/audit/follow-up-shares/${id}`, { method: 'PUT', body: data }),

  fetchRoles: () => adminRequest('/roles'),
  fetchPermissions: () => adminRequest('/roles/permissions'),
  createRole: (data) => adminRequest('/roles', { method: 'POST', body: data }),
  updateRole: (id, data) => adminRequest(`/roles/${id}`, { method: 'PUT', body: data }),
  deleteRole: (id) => adminRequest(`/roles/${id}`, { method: 'DELETE' }),

  fetchAdmins: () => adminRequest('/roles/admins'),
  createAdminWithRoles: (data) => adminRequest('/roles/admins', { method: 'POST', body: data }),
  updateAdminWithRoles: (id, data) => adminRequest(`/roles/admin/${id}`, { method: 'PUT', body: data }),
  toggleAdminStatus: (id) => adminRequest(`/roles/admin/${id}/status`, { method: 'PUT' }),

  getAuditLogs: (params) => adminRequest(`/audit-logs${toQuery(params)}`),

  importOpportunities: async (file) => {
    const form = new FormData();
    form.append('file', file);
    return adminRequest('/import', { method: 'POST', body: form });
  },

  uploadFile: async (file) => {
    const form = new FormData();
    form.append('file', file);
    return adminRequest('/upload', { method: 'POST', body: form });
  },

  getBanners: (params) => adminRequest(`/banners${toQuery(params)}`),
  createBanner: (data) => adminRequest('/banners', { method: 'POST', body: data }),
  updateBanner: (id, data) => adminRequest(`/banners/${id}`, { method: 'PUT', body: data }),
  deleteBanner: (id) => adminRequest(`/banners/${id}`, { method: 'DELETE' }),

  getAnnouncements: (params) => adminRequest(`/announcements${toQuery(params)}`),
  createAnnouncement: (data) => adminRequest('/announcements', { method: 'POST', body: data }),
  updateAnnouncement: (id, data) => adminRequest(`/announcements/${id}`, { method: 'PUT', body: data }),
  deleteAnnouncement: (id) => adminRequest(`/announcements/${id}`, { method: 'DELETE' }),

  sendNotification: (data) => adminRequest('/notifications/send', { method: 'POST', body: data }),
  getNotificationHistory: (params) => adminRequest(`/notifications/history${toQuery(params)}`),

  getAdmins: (params) => adminRequest(`/admins${toQuery(params)}`),
  createAdmin: (data) => adminRequest('/admins', { method: 'POST', body: data }),
  updateAdmin: (id, data) => adminRequest(`/admins/${id}`, { method: 'PUT', body: data }),
  deleteAdmin: (id) => adminRequest(`/admins/${id}`, { method: 'DELETE' }),

  getFinance: () => adminRequest('/finance'),

  getCategories: (params) => adminRequest(`/categories${toQuery(params)}`),
  createCategory: (data) => adminRequest('/categories', { method: 'POST', body: data }),
  updateCategory: (id, data) => adminRequest(`/categories/${id}`, { method: 'PUT', body: data }),
  deleteCategory: (id) => adminRequest(`/categories/${id}`, { method: 'DELETE' }),

  getTags: (params) => adminRequest(`/tags${toQuery(params)}`),
  createTag: (data) => adminRequest('/tags', { method: 'POST', body: data }),
  updateTag: (id, data) => adminRequest(`/tags/${id}`, { method: 'PUT', body: data }),
  deleteTag: (id) => adminRequest(`/tags/${id}`, { method: 'DELETE' }),
};
