/**
 * 小程序端支付渠道解析（对齐 client 的支付抽象：mock + 微信 JSAPI）。
 *
 * H5 的 waffo（托管收银台 redirect）等渠道需要浏览器跳转，小程序内无法拉起，
 * 因此在渠道列表里过滤，仅保留小程序可完成支付的渠道：
 *   - mock：模拟支付（开发/测试，永远可用）
 *   - wechat：微信支付 JSAPI（wx.requestPayment）
 * 返回结构供充值页/充值弹窗直接使用。
 */
const MINIAPPA_ABLE = ['mock', 'wechat'];

import { api } from '@/api/index';

export async function resolveMiniappChannels() {
  try {
    const res = await api.rechargeChannels();
    const all = res?.channels || ['mock'];
    const defaultChannel = res?.defaultChannel || (all.length ? all[0] : 'mock');
    const able = all.filter((c) => MINIAPPA_ABLE.includes(c));
    // 微信 JSAPI 是首选（配置齐全时）；否则 mock 兜底且不阻断
    const channel = able.includes('wechat') ? 'wechat' : able.length ? able[0] : 'mock';
    return { channels: able.length ? able : ['mock'], channel, defaultChannel };
  } catch (e) {
    return { channels: ['mock'], channel: 'mock', defaultChannel: 'mock' };
  }
}

export function channelLabel(value) {
  const map = { wechat: '微信支付', alipay: '支付宝', mock: '模拟支付', waffo: '托管收银台' };
  return map[value] || value;
}