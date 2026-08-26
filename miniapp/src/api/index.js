/**
 * API 接口层：镜像 client/src/api/index.js 的方法签名，网络层走 @/common/request
 */
import { request, buildQuery } from '@/common/request';

export const api = {
  // 认证
  wechatLogin: (code) => request('/auth/wechat-login', { method: 'POST', body: { code }, auth: false }),
  bindWechat: (data) => request('/auth/bind-wechat', { method: 'POST', body: data, auth: false }),
  wechatPhone: (code) => request('/auth/phone', { method: 'POST', body: { code }, auth: false }),
  login: (data) => request('/auth/login', { method: 'POST', body: data, auth: false }),
  register: (data) => request('/auth/register', { method: 'POST', body: data, auth: false }),
  resetPassword: (data) => request('/auth/reset-password', { method: 'POST', body: data, auth: false }),
  sendResetCode: (data) => request('/auth/send-reset-code', { method: 'POST', body: data, auth: false }),
  me: () => request('/auth/me'),
  updateMe: (data) => request('/auth/me', { method: 'PUT', body: data }),
  changePassword: (data) => request('/auth/change-password', { method: 'PUT', body: data }),

  // 商机
  opportunities: (params) => request('/opportunities' + buildQuery(params)),
  opportunity: (id) => request('/opportunities/' + id),
  createOpportunity: (data) => request('/opportunities', { method: 'POST', body: data }),
  markInvalid: (id, data) => request('/opportunities/' + id + '/invalid-mark', { method: 'POST', body: data }),

  // 购买
  purchase: (data) => request('/orders', { method: 'POST', body: data }),
  myOrders: (params) => request('/orders/my' + buildQuery(params)),

  // 积分
  pointsBalance: () => request('/points/balance'),
  pointsLogs: (params) => request('/points/logs' + buildQuery(params)),
  recharge: (data) => request('/points/recharge', { method: 'POST', body: data }),
  rechargeChannels: () => request('/points/recharge/channels'),
  rechargeOrderStatus: (orderNo) => request('/points/recharge/order/' + orderNo),
  rechargeMockPay: (orderNo) => request('/points/recharge/mock-pay/' + orderNo, { method: 'POST' }),

  // CRM
  crmList: (params) => request('/crm' + buildQuery(params)),
  crmDetail: (id) => request('/crm/' + id),
  crmAdd: (data) => request('/crm', { method: 'POST', body: data }),
  crmPublish: (id, data) => request('/crm/' + id + '/publish', { method: 'POST', body: data }),

  // 跟进
  followUps: (crmId) => request('/follow-ups/' + crmId),
  addFollowUp: (data) => request('/follow-ups', { method: 'POST', body: data }),
  shareFollowUp: (data) => request('/follow-ups/share', { method: 'POST', body: data }),
  markHelpful: (data) => request('/follow-ups/helpful', { method: 'POST', body: data }),
  reportShare: (data) => request('/follow-ups/report', { method: 'POST', body: data }),

  // 邀请
  invitationMe: () => request('/invitations/me'),

  // Banner
  banners: () => request('/banners'),

  // 排行榜
  rankings: (params) => request('/rankings' + buildQuery(params)),

  // 通知
  notifications: (params) => request('/notifications' + buildQuery(params)),
  markNotificationRead: (id) => request('/notifications/' + id + '/read', { method: 'PUT' }),
  markAllRead: () => request('/notifications/read-all', { method: 'PUT' }),

  // 提醒
  reminders: (params) => request('/reminders' + buildQuery(params)),

  // 信用分
  credits: (params) => request('/credits' + buildQuery(params)),

  // 统计
  myStats: () => request('/stats/me'),

  // 协议（公开接口）
  agreement: (type) => request('/agreement/' + type, { auth: false }),

  // 公告
  announcements: () => request('/announcements'),
  announcementDetail: (id) => request('/announcements/' + id),
};