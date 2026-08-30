/**
 * 支付渠道解析（单代码库同时服务 H5 与小程序，条件编译区分平台）。
 *
 * - 小程序端：waffo（托管收银台 redirect）/ alipay 等需要浏览器跳转的渠道
 *   无法在小程序内拉起，仅保留 mock + 微信 JSAPI。
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
    const able = PLATFORM_ABLE ? all.filter((c) => PLATFORM_ABLE.includes(c)) : all;
    // 微信 JSAPI 是小程序端首选（配置齐全时）；否则 mock 兜底且不阻断
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
  const map = { wechat: '微信支付', alipay: '支付宝', mock: '模拟支付', waffo: '托管收银台' };
  return map[value] || value;
}