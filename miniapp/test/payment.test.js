import { describe, it, expect, vi, beforeEach } from 'vitest';

// mock api 层（payment 依赖 rechargeChannels）
vi.mock('@/api/index', () => ({
  api: {
    rechargeChannels: vi.fn(),
  },
}));

// mock uni 全局（getSystemInfoSync / showModal / login）
global.uni = {
  getSystemInfoSync: vi.fn(() => ({ platform: 'devtools', version: '8.0.90' })),
  showModal: vi.fn(),
  login: vi.fn(),
};

global.wx = undefined;

import { api } from '@/api/index';
import {
  resolveMiniappChannels,
  channelLabel,
  checkIosVirtualPayVersion,
  getWxLoginCode,
  requestVirtualPayment,
} from '@/common/payment';

describe('channelLabel', () => {
  it('已知渠道返回中文标签，未知渠道原样返回', () => {
    expect(channelLabel('wechat')).toBe('微信虚拟支付');
    expect(channelLabel('alipay')).toBe('支付宝');
    expect(channelLabel('mock')).toBe('模拟支付');
    expect(channelLabel('waffo')).toBe('托管收银台');
    expect(channelLabel('stripe')).toBe('stripe');
  });
});

describe('resolveMiniappChannels（MP-WEIXIN 语义：仅 mock + wechat 可用，优先 wechat）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('全渠道可用时过滤为 mock/wechat 且优先 wechat', async () => {
    api.rechargeChannels.mockResolvedValue({
      channels: ['wechat', 'alipay', 'waffo', 'mock'],
      defaultChannel: 'alipay',
    });
    const res = await resolveMiniappChannels();
    expect(res.channels).toEqual(['wechat', 'mock']);
    expect(res.channel).toBe('wechat');
  });

  it('无 wechat 时取第一个可用渠道', async () => {
    api.rechargeChannels.mockResolvedValue({ channels: ['alipay', 'mock'] });
    const res = await resolveMiniappChannels();
    expect(res.channel).toBe('mock');
    expect(res.channels).toEqual(['mock']);
  });

  it('接口失败时兜底 mock 渠道', async () => {
    api.rechargeChannels.mockRejectedValue(new Error('network down'));
    const res = await resolveMiniappChannels();
    expect(res).toEqual({ channels: ['mock'], channel: 'mock', defaultChannel: 'mock' });
  });
});

describe('checkIosVirtualPayVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('非 iOS 平台直接放行', () => {
    uni.getSystemInfoSync.mockReturnValue({ platform: 'devtools', version: '8.0.90' });
    expect(checkIosVirtualPayVersion()).toBe(true);
    expect(uni.showModal).not.toHaveBeenCalled();
  });

  it('iOS 且微信版本 ≥ 8.0.68 放行', () => {
    uni.getSystemInfoSync.mockReturnValue({ platform: 'ios', version: '8.0.68' });
    expect(checkIosVirtualPayVersion()).toBe(true);
  });

  it('iOS 且微信版本过低时弹提示并拦截', () => {
    uni.getSystemInfoSync.mockReturnValue({ platform: 'ios', version: '8.0.50' });
    expect(checkIosVirtualPayVersion()).toBe(false);
    expect(uni.showModal).toHaveBeenCalledWith(
      expect.objectContaining({ title: '提示', showCancel: false })
    );
  });

  it('iOS 且版本号缺失按 0 处理拦截', () => {
    uni.getSystemInfoSync.mockReturnValue({ platform: 'ios' });
    expect(checkIosVirtualPayVersion()).toBe(false);
  });
});

describe('getWxLoginCode', () => {
  it('成功时返回 code', async () => {
    uni.login.mockImplementation(({ success }) => success({ code: 'wx-abc' }));
    await expect(getWxLoginCode()).resolves.toBe('wx-abc');
  });

  it('无 code 时抛错', async () => {
    uni.login.mockImplementation(({ success }) => success({}));
    await expect(getWxLoginCode()).rejects.toThrow('未获取到微信登录凭证');
  });

  it('登录失败时抛 errMsg', async () => {
    uni.login.mockImplementation(({ fail }) => fail({ errMsg: 'login:fail cancel' }));
    await expect(getWxLoginCode()).rejects.toThrow('login:fail cancel');
  });
});

describe('requestVirtualPayment', () => {
  it('环境不支持时拒绝', async () => {
    global.wx = undefined;
    await expect(requestVirtualPayment({ signData: {} })).rejects.toThrow('当前环境不支持微信虚拟支付');
  });

  it('支持时透传 signData/paySig/signature 并 resolve', async () => {
    const invoke = vi.fn(({ success }) => success({ ok: 1 }));
    global.wx = { requestVirtualPayment: invoke };
    const res = await requestVirtualPayment({ signData: { s: 1 }, paySig: 'p', signature: 'g' });
    expect(res).toEqual({ ok: 1 });
    expect(invoke).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'short_series_goods',
        signData: { s: 1 },
        paySig: 'p',
        signature: 'g',
      })
    );
    global.wx = undefined;
  });
});
