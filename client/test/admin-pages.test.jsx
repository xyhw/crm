// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';

vi.mock('../src/admin/api', () => ({
  adminApi: {
    login: vi.fn().mockResolvedValue({ token: 'admin-token' }),
    getMe: vi.fn().mockResolvedValue({ username: 'admin' }),
    getDashboard: vi.fn().mockResolvedValue({ totalUsers: 0, totalOpportunities: 0, totalOrders: 0, todayOrders: 0 }),
    getTrends: vi.fn().mockResolvedValue({ list: [] }),
    getDistribution: vi.fn().mockResolvedValue({}),
    getOpportunities: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    getOpportunityDetail: vi.fn().mockResolvedValue({}),
    updateOpportunity: vi.fn().mockResolvedValue({}),
    getUsers: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    getUserDetail: vi.fn().mockResolvedValue({}),
    updateUser: vi.fn().mockResolvedValue({}),
    adjustPoints: vi.fn().mockResolvedValue({}),
    adjustCredit: vi.fn().mockResolvedValue({}),
    getOrders: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    getPointsLogs: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    getLevels: vi.fn().mockResolvedValue([]),
    updateLevel: vi.fn().mockResolvedValue({}),
    getConfigs: vi.fn().mockResolvedValue({}),
    updateConfig: vi.fn().mockResolvedValue({}),
    getAuditList: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    auditFollowUp: vi.fn().mockResolvedValue({}),
    fetchRoles: vi.fn().mockResolvedValue([]),
    fetchPermissions: vi.fn().mockResolvedValue([]),
    createRole: vi.fn().mockResolvedValue({}),
    updateRole: vi.fn().mockResolvedValue({}),
    deleteRole: vi.fn().mockResolvedValue({}),
    fetchAdmins: vi.fn().mockResolvedValue([]),
    createAdmin: vi.fn().mockResolvedValue({}),
    updateAdmin: vi.fn().mockResolvedValue({}),
    toggleAdminStatus: vi.fn().mockResolvedValue({}),
    getAdmins: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    deleteAdmin: vi.fn().mockResolvedValue({}),
    getAuditLogs: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    importOpportunities: vi.fn().mockResolvedValue({}),
    uploadFile: vi.fn().mockResolvedValue({ url: '' }),
    getBanners: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    createBanner: vi.fn().mockResolvedValue({}),
    updateBanner: vi.fn().mockResolvedValue({}),
    deleteBanner: vi.fn().mockResolvedValue({}),
    sendNotification: vi.fn().mockResolvedValue({}),
    getNotificationHistory: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    getFinance: vi.fn().mockResolvedValue({}),
    getCategories: vi.fn().mockResolvedValue([]),
    createCategory: vi.fn().mockResolvedValue({}),
    updateCategory: vi.fn().mockResolvedValue({}),
    deleteCategory: vi.fn().mockResolvedValue({}),
    getTags: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    createTag: vi.fn().mockResolvedValue({}),
    updateTag: vi.fn().mockResolvedValue({}),
    deleteTag: vi.fn().mockResolvedValue({}),
  },
}));

const ADMIN_PAGES = [
  ['Dashboard', '../src/pages/admin/Dashboard'],
  ['OpportunityList', '../src/pages/admin/OpportunityList'],
  ['UserList', '../src/pages/admin/UserList'],
  ['OrderList', '../src/pages/admin/OrderList'],
  ['PointsList', '../src/pages/admin/PointsList'],
  ['LevelConfig', '../src/pages/admin/LevelConfig'],
  ['SystemConfig', '../src/pages/admin/SystemConfig'],
  ['AgreementConfig', '../src/pages/admin/AgreementConfig'],
  ['AuditList', '../src/pages/admin/AuditList'],
  ['RoleManagement', '../src/pages/admin/RoleManagement'],
  ['AuditLogPage', '../src/pages/admin/AuditLogPage'],
  ['StatsDetailed', '../src/pages/admin/StatsDetailed'],
  ['OpportunityImport', '../src/pages/admin/OpportunityImport'],
  ['BannerManager', '../src/pages/admin/BannerManager'],
  ['NotificationManager', '../src/pages/admin/NotificationManager'],
  ['AdminManage', '../src/pages/admin/AdminManage'],
  ['FinanceDashboard', '../src/pages/admin/FinanceDashboard'],
  ['CategoryManager', '../src/pages/admin/CategoryManager'],
  ['TagManager', '../src/pages/admin/TagManager'],
];

describe('后台管理页冒烟测试（开发需求 6.2）', () => {
  beforeEach(() => {
    localStorage.setItem('admin_token', 'test-admin-token');
  });

  afterEach(() => {
    cleanup();
    localStorage.removeItem('admin_token');
  });

  for (const [name, path] of ADMIN_PAGES) {
    it(`渲染 ${name} 不崩溃`, async () => {
      const mod = await import(path);
      const Comp = mod.default;
      let failed = null;
      const origError = console.error;
      console.error = (...args) => {
        const msg = args.join(' ');
        if (msg.includes('Element type is invalid') || msg.includes('Uncaught')) {
          failed = msg.slice(0, 120);
        }
        origError(...args);
      };
      try {
        render(
          <MemoryRouter>
            <Comp />
          </MemoryRouter>
        );
        await waitFor(() => {
          expect(document.body.innerHTML).toBeTruthy();
        });
      } catch (e) {
        failed = 'THREW: ' + e.message.slice(0, 120);
      } finally {
        console.error = origError;
      }
      expect(failed).toBeNull();
    });
  }
});