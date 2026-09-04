/**
 * 支付渠道解析（单代码库同时服务 H5 与小程序，条件编译区分平台）。
 *
 * - 小程序端：waffo / alipay 等需要浏览器跳转的渠道无法在小程序内拉起，
 *   仅保留 mock + 微信虚拟支付（wx.requestVirtualPayment）。
 * - H5 端：全部渠道可用，redirect 类渠道由充值页处理跳转。
 */
// #ifdef MP-WEIXIN
const PLATFORM_ABLE = ['mock', 'wechat'];
// #endif
// #ifndef MP-WEIXIN
const PLATFORM_ABLE = null;
// #endif

import { api } from '@/api/index';

export async function resolveMiniappChannels() {
  try {
    const res = await api.rechargeChannels();
    const all = res?.channels || ['mock'];
    const defaultChannel = res?.defaultChannel || (all.length ? all[0] : 'mock');
    const able = PLATFORM_ABLE
      ? all.filter((c) => PLATFORM_ABLE.includes(c))
      : all.filter((c) => c !== 'wechat');
    // #ifdef MP-WEIXIN
    const channel = able.includes('wechat') ? 'wechat' : able.length ? able[0] : 'mock';
    // #endif
    // #ifndef MP-WEIXIN
    const channel = defaultChannel;
    // #endif
    return { channels: able.length ? able : ['mock'], channel, defaultChannel };
  } catch (e) {
    return { channels: ['mock'], channel: 'mock', defaultChannel: 'mock' };
  }
}

export function channelLabel(value) {
  const map = { wechat: '微信虚拟支付', alipay: '支付宝', mock: '模拟支付', waffo: '托管收银台' };
  return map[value] || value;
}

/** iOS 端需微信客户端 ≥ 8.0.68 才能拉起虚拟支付 */
export function checkIosVirtualPayVersion() {
  try {
    const sys = uni.getSystemInfoSync();
    if (sys.platform !== 'ios') return true;
    const cur = String(sys.version || '0').split('.').map(Number);
    const base = [8, 0, 68];
    for (let i = 0; i < 3; i++) {
      if ((cur[i] || 0) > base[i]) return true;
      if ((cur[i] || 0) < base[i]) {
        uni.showModal({ title: '提示', content: '请将微信更新至最新版后再进行支付', showCancel: false });
        return false;
      }
    }
    return true;
  } catch {
    return true;
  }
}

export function getWxLoginCode() {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (res) => {
        if (res.code) resolve(res.code);
        else reject(new Error('未获取到微信登录凭证'));
      },
      fail: (err) => reject(new Error(err?.errMsg || '微信登录失败')),
    });
  });
}

export function requestVirtualPayment(payData) {
  return new Promise((resolve, reject) => {
    const invoke = typeof wx !== 'undefined' && wx.requestVirtualPayment
      ? wx.requestVirtualPayment.bind(wx)
      : null;
    if (!invoke) {
      reject(new Error('当前环境不支持微信虚拟支付'));
      return;
    }
    invoke({
      mode: payData.mode || 'short_series_goods',
      signData: payData.signData,
      paySig: payData.paySig,
      signature: payData.signature,
      success: resolve,
      fail: reject,
    });
  });
}
