/**
 * 管理后台专用请求层：独立于用户端 request.js
 * - admin_token 单独存储（hof_admin_token）
 * - 前缀 /api/v1/admin
 * - 401 跳转管理后台登录页
 */
import { API_BASE, REQUEST_TIMEOUT } from '@/common/config';

const ADMIN_TOKEN_KEY = 'hof_admin_token';
const ADMIN_USER_KEY = 'hof_admin_user';

export function getAdminToken() {
  return uni.getStorageSync(ADMIN_TOKEN_KEY) || '';
}
export function setAdminAuth(token, admin) {
  uni.setStorageSync(ADMIN_TOKEN_KEY, token);
  if (admin) uni.setStorageSync(ADMIN_USER_KEY, JSON.stringify(admin));
}
export function getAdminUser() {
  try {
    const raw = uni.getStorageSync(ADMIN_USER_KEY);
    if (!raw) return null;
    return typeof raw === 'object' ? raw : JSON.parse(raw);
  } catch (e) {
    return null;
  }
}
export function clearAdminAuth() {
  uni.removeStorageSync(ADMIN_TOKEN_KEY);
  uni.removeStorageSync(ADMIN_USER_KEY);
}

function toQuery(params) {
  if (!params) return '';
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? '?' + parts.join('&') : '';
}

function req(options) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: API_BASE + '/v1/admin' + options.path,
      method: options.method || 'GET',
      data: options.body,
      header: options.headers || {},
      timeout: REQUEST_TIMEOUT,
      success: (res) => resolve({ statusCode: res.statusCode, data: res.data }),
      fail: () => reject(new Error('网络异常，请稍后重试')),
    });
  });
}

/**
 * 管理后台统一请求：携带 admin_token，401 时跳管理登录页
 */
export async function adminRequest(path, opts = {}) {
  const { method = 'GET', body, auth = true } = opts;
  const headers = { 'Content-Type': 'application/json' };
  const token = getAdminToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let resp;
  try {
    resp = await req({ path, method, body, headers });
  } catch (e) {
    throw new Error('网络异常，请稍后重试');
  }

  const json = resp.data;
  if (typeof json !== 'object' || json === null) {
    throw new Error('服务器响应异常');
  }

  if (json.code === 401) {
    clearAdminAuth();
    uni.reLaunch({ url: '/pages/admin/login' });
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

/**
 * 管理后台接口集合，镜像 client/src/admin/api.js 的方法签名
 */
export const adminApi = {
  login: (data) => adminRequest('/auth/login', { method: 'POST', body: data, auth: false }),
  getMe: () => adminRequest('/auth/me'),

  getDashboard: () => adminRequest('/stats/dashboard'),
  getTrends: () => adminRequest('/stats/trends'),
  getDistribution: () => adminRequest('/stats/distribution'),

  getOpportunities: (params) => adminRequest('/opportunities' + toQuery(params)),
  getOpportunityDetail: (id) => adminRequest('/opportunities/' + id),
  updateOpportunity: (id, data) => adminRequest('/opportunities/' + id + '/status', { method: 'PUT', body: data }),

  getUsers: (params) => adminRequest('/users' + toQuery(params)),
  getUserDetail: (id) => adminRequest('/users/' + id),
  updateUser: (id, data) => adminRequest('/users/' + id, { method: 'PUT', body: data }),
  adjustPoints: (id, data) => adminRequest('/users/' + id + '/points', { method: 'PUT', body: data }),
  adjustCredit: (id, data) => adminRequest('/users/' + id + '/credit', { method: 'PUT', body: data }),

  getOrders: (params) => adminRequest('/orders' + toQuery(params)),

  getPointsLogs: (params) => adminRequest('/points' + toQuery(params)),

  getRechargeOrders: (params) => adminRequest('/recharge-orders' + toQuery(params)),
  getRechargeSummary: () => adminRequest('/recharge-orders/summary'),
  syncRechargeOrder: (orderNo) => adminRequest('/recharge-orders/' + orderNo + '/sync', { method: 'POST' }),
  refundRechargeOrder: (orderNo, data) =>
    adminRequest('/recharge-orders/' + orderNo + '/refund', { method: 'POST', body: data }),

  getLevels: () => adminRequest('/levels'),
  updateLevel: (id, data) => adminRequest('/levels/' + id, { method: 'PUT', body: data }),

  getConfigs: () => adminRequest('/configs'),
  updateConfig: (data) => adminRequest('/configs', { method: 'PUT', body: data }),

  getAuditList: (params) => adminRequest('/audit/follow-up-shares' + toQuery(params)),
  auditFollowUp: (id, data) => adminRequest('/audit/follow-up-shares/' + id, { method: 'PUT', body: data }),

  fetchRoles: () => adminRequest('/roles'),
  fetchPermissions: () => adminRequest('/roles/permissions'),
  createRole: (data) => adminRequest('/roles', { method: 'POST', body: data }),
  updateRole: (id, data) => adminRequest('/roles/' + id, { method: 'PUT', body: data }),
  deleteRole: (id) => adminRequest('/roles/' + id, { method: 'DELETE' }),

  fetchAdmins: () => adminRequest('/roles/admins'),
  createAdminWithRoles: (data) => adminRequest('/roles/admins', { method: 'POST', body: data }),
  updateAdminWithRoles: (id, data) => adminRequest('/roles/admin/' + id, { method: 'PUT', body: data }),
  toggleAdminStatus: (id) => adminRequest('/roles/admin/' + id + '/status', { method: 'PUT' }),

  getAuditLogs: (params) => adminRequest('/audit-logs' + toQuery(params)),

  importOpportunities: (filePath) => {
    return new Promise((resolve, reject) => {
      uni.uploadFile({
        url: API_BASE + '/v1/admin/import',
        filePath,
        name: 'file',
        header: { Authorization: `Bearer ${getAdminToken()}` },
        success: (res) => {
          try {
            const json = JSON.parse(res.data);
            if (json.code === 0) resolve(json.data);
            else if (json.code === 401) {
              clearAdminAuth();
              uni.reLaunch({ url: '/pages/admin/login' });
              reject(new Error(json.message || '请先登录'));
            } else {
              reject(new Error(json.message || '导入失败'));
            }
          } catch (e) {
            reject(new Error('导入响应异常'));
          }
        },
        fail: () => reject(new Error('上传失败')),
      });
    });
  },

  uploadFile: (filePath) => {
    return new Promise((resolve, reject) => {
      uni.uploadFile({
        url: API_BASE + '/v1/admin/upload',
        filePath,
        name: 'file',
        header: { Authorization: `Bearer ${getAdminToken()}` },
        success: (res) => {
          try {
            const json = JSON.parse(res.data);
            if (json.code === 0) resolve(json.data);
            else reject(new Error(json.message || '上传失败'));
          } catch (e) {
            reject(new Error('上传响应异常'));
          }
        },
        fail: () => reject(new Error('上传失败')),
      });
    });
  },

  getBanners: (params) => adminRequest('/banners' + toQuery(params)),
  createBanner: (data) => adminRequest('/banners', { method: 'POST', body: data }),
  updateBanner: (id, data) => adminRequest('/banners/' + id, { method: 'PUT', body: data }),
  deleteBanner: (id) => adminRequest('/banners/' + id, { method: 'DELETE' }),

  getAnnouncements: (params) => adminRequest('/announcements' + toQuery(params)),
  createAnnouncement: (data) => adminRequest('/announcements', { method: 'POST', body: data }),
  updateAnnouncement: (id, data) => adminRequest('/announcements/' + id, { method: 'PUT', body: data }),
  deleteAnnouncement: (id) => adminRequest('/announcements/' + id, { method: 'DELETE' }),

  sendNotification: (data) => adminRequest('/notifications/send', { method: 'POST', body: data }),
  getNotificationHistory: (params) => adminRequest('/notifications/history' + toQuery(params)),

  getAdmins: (params) => adminRequest('/admins' + toQuery(params)),
  createAdmin: (data) => adminRequest('/admins', { method: 'POST', body: data }),
  updateAdmin: (id, data) => adminRequest('/admins/' + id, { method: 'PUT', body: data }),
  deleteAdmin: (id) => adminRequest('/admins/' + id, { method: 'DELETE' }),

  getFinance: () => adminRequest('/finance'),

  getCategories: (params) => adminRequest('/categories' + toQuery(params)),
  createCategory: (data) => adminRequest('/categories', { method: 'POST', body: data }),
  updateCategory: (id, data) => adminRequest('/categories/' + id, { method: 'PUT', body: data }),
  deleteCategory: (id) => adminRequest('/categories/' + id, { method: 'DELETE' }),

  getTags: (params) => adminRequest('/tags' + toQuery(params)),
  createTag: (data) => adminRequest('/tags', { method: 'POST', body: data }),
  updateTag: (id, data) => adminRequest('/tags/' + id, { method: 'PUT', body: data }),
  deleteTag: (id) => adminRequest('/tags/' + id, { method: 'DELETE' }),
};
