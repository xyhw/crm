import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/v1/admin',
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (res.code !== 0) {
      return Promise.reject(new Error(res.message || '请求失败'));
    }
    return res.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export const adminApi = {
  login: (data) => apiClient.post('/auth/login', data),
  getMe: () => apiClient.get('/auth/me'),
  
  getDashboard: () => apiClient.get('/stats/dashboard'),
  getTrends: () => apiClient.get('/stats/trends'),
  getDistribution: () => apiClient.get('/stats/distribution'),
  
  getOpportunities: (params) => apiClient.get('/opportunities', { params }),
  getOpportunityDetail: (id) => apiClient.get(`/opportunities/${id}`),
  updateOpportunity: (id, data) => apiClient.put(`/opportunities/${id}/status`, data),
  
  getUsers: (params) => apiClient.get('/users', { params }),
  getUserDetail: (id) => apiClient.get(`/users/${id}`),
  updateUser: (id, data) => apiClient.put(`/users/${id}`, data),
  adjustPoints: (id, data) => apiClient.put(`/users/${id}/points`, data),
  adjustCredit: (id, data) => apiClient.put(`/users/${id}/credit`, data),
  
  getOrders: (params) => apiClient.get('/orders', { params }),
  
  getPointsLogs: (params) => apiClient.get('/points', { params }),
  
  getLevels: () => apiClient.get('/levels'),
  updateLevel: (id, data) => apiClient.put(`/levels/${id}`, data),
  
  getConfigs: () => apiClient.get('/configs'),
  updateConfig: (data) => apiClient.put('/configs', data),
  
  getAuditList: (params) => apiClient.get('/audit/follow-up-shares', { params }),
  auditFollowUp: (id, data) => apiClient.put(`/audit/follow-up-shares/${id}`, data),
  
  // 角色管理
  fetchRoles: () => apiClient.get('/roles'),
  fetchPermissions: () => apiClient.get('/roles/permissions'),
  createRole: (data) => apiClient.post('/roles', data),
  updateRole: (id, data) => apiClient.put(`/roles/${id}`, data),
  deleteRole: (id) => apiClient.delete(`/roles/${id}`),
  
  // 管理员管理
  fetchAdmins: () => apiClient.get('/roles/admins'),
  createAdmin: (data) => apiClient.post('/roles/admins', data),
  updateAdmin: (id, data) => apiClient.put(`/roles/admin/${id}`, data),
  toggleAdminStatus: (id) => apiClient.put(`/roles/admin/${id}/status`),
  
  // 操作日志
  getAuditLogs: (params) => apiClient.get('/audit-logs', { params }),
  
  // 导入
  importOpportunities: (formData) => apiClient.post('/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  
  // 上传
  uploadFile: (formData) => apiClient.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  // Banner
  getBanners: (params) => apiClient.get('/banners', { params }),
  createBanner: (data) => apiClient.post('/banners', data),
  updateBanner: (id, data) => apiClient.put(`/banners/${id}`, data),
  deleteBanner: (id) => apiClient.delete(`/banners/${id}`),

  // 公告
  getAnnouncements: (params) => apiClient.get('/announcements', { params }),
  createAnnouncement: (data) => apiClient.post('/announcements', data),
  updateAnnouncement: (id, data) => apiClient.put(`/announcements/${id}`, data),
  deleteAnnouncement: (id) => apiClient.delete(`/announcements/${id}`),

  // 通知推送
  sendNotification: (data) => apiClient.post('/notifications/send', data),
  getNotificationHistory: (params) => apiClient.get('/notifications/history', { params }),

  // 管理员管理
  getAdmins: (params) => apiClient.get('/admins', { params }),
  createAdmin: (data) => apiClient.post('/admins', data),
  updateAdmin: (id, data) => apiClient.put(`/admins/${id}`, data),
  deleteAdmin: (id) => apiClient.delete(`/admins/${id}`),

  // 财务看板
  getFinance: () => apiClient.get('/finance'),

  // 分类管理
  getCategories: () => apiClient.get('/categories'),
  createCategory: (data) => apiClient.post('/categories', data),
  updateCategory: (id, data) => apiClient.put(`/categories/${id}`, data),
  deleteCategory: (id) => apiClient.delete(`/categories/${id}`),

  // 标签管理
  getTags: (params) => apiClient.get('/tags', { params }),
  createTag: (data) => apiClient.post('/tags', data),
  updateTag: (id, data) => apiClient.put(`/tags/${id}`, data),
  deleteTag: (id) => apiClient.delete(`/tags/${id}`),
};

export default adminApi;