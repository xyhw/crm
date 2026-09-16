import { describe, it, expect, vi, beforeEach } from 'vitest';

// mock 网络层（api 层依赖 request/buildQuery；buildQuery 保留真实实现）
vi.mock('@/common/request', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    request: vi.fn(() => Promise.resolve({})),
  };
});

import { request } from '@/common/request';
import { api } from '@/api/index';

describe('api 层 URL/方法映射', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('认证接口', async () => {
    await api.login({ phone: '1', password: 'x' });
    expect(request).toHaveBeenCalledWith('/auth/login', { method: 'POST', body: { phone: '1', password: 'x' }, auth: false });

    await api.me();
    expect(request).toHaveBeenCalledWith('/auth/me');

    await api.changePassword({ oldPassword: 'a', newPassword: 'b' });
    expect(request).toHaveBeenCalledWith('/auth/change-password', { method: 'PUT', body: { oldPassword: 'a', newPassword: 'b' } });
  });

  it('商机接口：buildQuery 拼接与 mine 标记', async () => {
    await api.opportunities({ keyword: '酒店', page: 2 });
    expect(request).toHaveBeenCalledWith('/opportunities?keyword=%E9%85%92%E5%BA%97&page=2');

    await api.myOpportunities({ status: 'sold' });
    const [url, opts] = request.mock.calls.at(-1);
    expect(url).toContain('/opportunities?');
    expect(url).toContain('mine=1');
    expect(url).toContain('status=sold');

    await api.markInvalid(13, { reason: '无效' });
    expect(request).toHaveBeenCalledWith('/opportunities/13/invalid-mark', { method: 'POST', body: { reason: '无效' } });
  });

  it('购买与订单接口', async () => {
    await api.purchase({ opportunityId: 13 });
    expect(request).toHaveBeenCalledWith('/orders', { method: 'POST', body: { opportunityId: 13 } });

    await api.myOrders({ page: 1 });
    expect(request).toHaveBeenCalledWith('/orders/my?page=1');
  });

  it('积分与充值接口', async () => {
    await api.pointsBalance();
    expect(request).toHaveBeenCalledWith('/points/balance');

    await api.recharge({ channel: 'mock', amount: 1000 });
    expect(request).toHaveBeenCalledWith('/points/recharge', { method: 'POST', body: { channel: 'mock', amount: 1000 } });

    await api.rechargeOrderStatus('ORD123');
    expect(request).toHaveBeenCalledWith('/points/recharge/order/ORD123');

    await api.rechargeMockPay('ORD123');
    expect(request).toHaveBeenCalledWith('/points/recharge/mock-pay/ORD123', { method: 'POST' });
  });
});
