import { defineStore } from 'pinia';
import { request } from '@/common/request';
import {
  getToken,
  setAuth,
  clearAuth,
  getCachedUser,
} from '@/common/storage';

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken(),
    user: getCachedUser(),
  }),
  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
  },
  actions: {
    setLogin(token, user, refreshToken) {
      this.token = token;
      this.user = user;
      setAuth(token, user, refreshToken);
    },

    /**
     * 微信静默登录：
     * - code 换取 openid。已绑定 -> 直接登录；未绑定 -> 抛出 need_bind_openid
     * - need_bind_openid 会携带 openid，供绑定页使用
     */
    async wechatLogin() {
      const code = await uni.login().then((res) => res.code);
      const data = await request('/auth/wechat-login', {
        method: 'POST',
        body: { code },
        auth: false,
      });

      if (data.bound && data.token) {
        this.setLogin(data.token, data.user, data.refreshToken);
        return { bound: true };
      }

      throw Object.assign(new Error('需要绑定手机号'), {
        need_bind: true,
        openid: data.openid,
        unionid: data.unionid,
      });
    },

    /**
     * 绑定手机号（授权手机号 code + openid）
     * @param {{phoneCode, openid, nickname?, inviteCode?}} payload
     */
    async bindPhone({ phoneCode, openid, nickname, inviteCode }) {
      // 先用 code 换取真实手机号（服务端调 getPhoneNumber）
      const { phone } = await request('/auth/phone', {
        method: 'POST',
        body: { code: phoneCode },
        auth: false,
      });

      const data = await request('/auth/bind-wechat', {
        method: 'POST',
        body: { openid, phone, nickname, inviteCode },
        auth: false,
      });

      this.setLogin(data.token, data.user, data.refreshToken);
      return data;
    },

    async login(phone, password) {
      const data = await request('/auth/login', {
        method: 'POST',
        body: { phone, password },
        auth: false,
      });
      this.setLogin(data.token, data.user, data.refreshToken);
      return data;
    },

    async register(payload) {
      const data = await request('/auth/register', {
        method: 'POST',
        body: payload,
        auth: false,
      });
      this.setLogin(data.token, data.user, data.refreshToken);
      return data;
    },

    async fetchMe() {
      const user = await request('/auth/me');
      this.user = { ...this.user, ...user };
      setAuth(this.token, this.user);
      return user;
    },

    logout() {
      this.token = '';
      this.user = null;
      clearAuth();
      uni.reLaunch({ url: '/pages/login/index' });
    },
  },
});

export function initAuthFromStorage() {
  // 启动时恢复，依赖 store 由各处按需实例化即可（getCachedUser 已被 state 初始化读取）
  return undefined;
}

export default useUserStore;