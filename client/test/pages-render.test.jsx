// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('../src/api', () => ({
  api: {
    opportunities: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    myOrders: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    notifications: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    reminders: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    crm: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    ranking: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    rankings: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    pointsLogs: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    points: vi.fn().mockResolvedValue({ points: 0, creditScore: 0 }),
    pointsBalance: vi.fn().mockResolvedValue({ points: 0, creditScore: 0 }),
    recharge: vi.fn().mockResolvedValue({}),
    rechargeChannels: vi.fn().mockResolvedValue({ channels: ['mock'], defaultChannel: 'mock' }),
    rechargeOrderStatus: vi.fn().mockResolvedValue({ status: 'paid' }),
    rechargeMockPay: vi.fn().mockResolvedValue({ code: 0 }),
    memberLevel: vi.fn().mockResolvedValue({}),
    credit: vi.fn().mockResolvedValue({}),
    invite: vi.fn().mockResolvedValue({}),
    invitationMe: vi.fn().mockResolvedValue({ inviteCode: 'x', list: [] }),
    agreement: vi.fn().mockResolvedValue({}),
    myHelps: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    redemptions: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    mallGoods: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    opportunity: vi.fn().mockResolvedValue({}),
    publish: vi.fn().mockResolvedValue({}),
    myStats: vi.fn().mockResolvedValue({ total: 0, active: 0, draft: 0 }),
    me: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../src/context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    AuthProvider: ({ children }) => <React.Fragment>{children}</React.Fragment>,
    useAuth: () => ({
      user: { id: 1, nickname: '测试', phone: '13800000001' },
      token: 'test-token',
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    }),
  };
});

const PAGES = [
  ['Hall', '../src/pages/Hall'],
  ['Invite', '../src/pages/Invite'],
  ['MyOrders', '../src/pages/MyOrders'],
  ['ReminderCenter', '../src/pages/ReminderCenter'],
  ['OpportunityDetail', '../src/pages/OpportunityDetail'],
  ['MemberLevel', '../src/pages/MemberLevel'],
  ['Support', '../src/pages/Support'],
  ['Notifications', '../src/pages/Notifications'],
  ['CRM', '../src/pages/CRM'],
  ['Credit', '../src/pages/Credit'],
  ['Ranking', '../src/pages/Ranking'],
  ['PointsFlow', '../src/pages/PointsFlow'],
  ['CRMDetail', '../src/pages/CRMDetail'],
  ['Points', '../src/pages/Points'],
  ['Publish', '../src/pages/Publish'],
  ['Agreement', '../src/pages/Agreement'],
];

describe('所有带 NavBar 页面渲染不崩溃', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  for (const [name, path] of PAGES) {
    it(`渲染 ${name} 不崩溃`, async () => {
      const mod = await import(path);
      const Comp = mod.default;
      let failed = null;
      const origError = console.error;
      console.error = (...args) => {
        const msg = args.join(' ');
        if (msg.includes('Element type is invalid') || msg.includes('Uncaught')) {
          failed = msg.slice(0, 100);
        }
        origError(...args);
      };
      try {
        render(
          <MemoryRouter initialEntries={['/']}>
            <Comp />
          </MemoryRouter>
        );
        await waitFor(() => {
          expect(document.body.innerHTML).toBeTruthy();
        });
      } catch (e) {
        failed = 'THREW: ' + e.message.slice(0, 100);
      } finally {
        console.error = origError;
        document.body.innerHTML = '';
      }
      expect(failed).toBeNull();
    });
  }
});
