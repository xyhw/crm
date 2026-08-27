/**
 * 微信小程序开放能力封装。
 *
 * 凭据通过环境变量注入，占位留待正式环境填入：
 *   - WX_MINIAPP_APPID  小程序 AppID
 *   - WX_MINIAPP_SECRET 小程序 AppSecret
 *
 * 未配置时 isConfigured() 返回 false，路由层据此返回「暂未配置」提示，
 * 保证 H5 与开发环境不被阻断；配置后无需改代码即可启用微信登录链路。
 */

const API_BASE = 'https://api.weixin.qq.com';

const config = {
  get appid() {
    return process.env.WX_MINIAPP_APPID || '';
  },
  get secret() {
    return process.env.WX_MINIAPP_SECRET || '';
  },
};

export function isWechatConfigured() {
  return Boolean(config.appid && config.secret);
}

async function wxFetch(pathname, options = {}) {
  const resp = await fetch(`${API_BASE}${pathname}`, {
    timeout: 10000,
    ...options,
  });
  if (!resp.ok) {
    throw new Error(`微信接口网络异常(${resp.status})`);
  }
  return resp.json();
}

/**
 * code2Session：wx.login 的 code 换 openid / unionid
 * @returns {Promise<{openid, unionid?, session_key}>}
 */
export async function code2Session(code) {
  const url =
    `/sns/jscode2session?appid=${encodeURIComponent(config.appid)}` +
    `&secret=${encodeURIComponent(config.secret)}` +
    `&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;
  const data = await wxFetch(url);
  if (data.errcode) {
    const map = {
      40029: '登录凭证已失效，请重试',
      40163: '操作过于频繁，请稍后重试',
      45011: '操作过于频繁，请稍后重试',
      40013: '小程序 AppID 无效，请检查 WX_MINIAPP_APPID 配置',
      40125: '小程序凭据无效，请检查 WX_MINIAPP_SECRET 配置',
      '-1': '微信服务暂不可用，请稍后重试',
    };
    throw new Error(map[String(data.errcode)] || `微信登录失败(${data.errcode})`);
  }
  if (!data.openid) {
    throw new Error('微信登录失败：未获取到用户标识');
  }
  return data;
}

// access_token 内存缓存（单实例部署足够；多实例需升级到 Redis）
let accessTokenCache = { token: '', expiresAt: 0 };

async function getAccessToken() {
  if (accessTokenCache.token && Date.now() < accessTokenCache.expiresAt) {
    return accessTokenCache.token;
  }
  const data = await wxFetch(
    `/cgi-bin/token?grant_type=client_credential` +
      `&appid=${encodeURIComponent(config.appid)}` +
      `&secret=${encodeURIComponent(config.secret)}`
  );
  if (!data.access_token) {
    const map = {
      40001: '小程序凭据无效，请检查 AppSecret 配置',
      40013: '小程序 AppID 无效，请检查配置',
    };
    throw new Error(map[String(data.errcode)] || `获取微信凭据失败(${data.errcode})`);
  }
  // 提前 5 分钟过期，避免临界点调用失败
  accessTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max((data.expires_in || 7200) - 300, 60) * 1000,
  };
  return accessTokenCache.token;
}

/**
 * 小程序「获取手机号」：button open-type="getPhoneNumber" 回调的动态 code 换手机号
 * @returns {Promise<string>} 纯手机号
 */
export async function getPhoneByCode(code) {
  const token = await getAccessToken();
  const data = await wxFetch(`/wxa/business/getuserphonenumber?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (data.errcode !== 0 || !data.phone_info) {
    throw new Error(`手机号获取失败(${data.errcode})：${data.errmsg || '请重试'}`);
  }
  return data.phone_info.purePhoneNumber;
}
