import { defineStore } from 'pinia';
import { adminApi, getAdminToken, getAdminUser, setAdminAuth, clearAdminAuth } from '../api/client';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: '',
    admin: null,
  }),
  getters: {
    isAuthed: (s) => Boolean(s.token),
    displayName: (s) => s.admin?.name || s.admin?.username || '管理员',
    roles: (s) => s.admin?.roles || [],
  },
  actions: {
    hydrate() {
      this.token = getAdminToken();
      this.admin = getAdminUser();
    },
    async login(username, password) {
      const res = await adminApi.login({ username, password });
      setAdminAuth(res.token, res.admin);
      this.token = res.token;
      this.admin = res.admin;
      return res;
    },
    logout() {
      clearAdminAuth();
      this.token = '';
      this.admin = null;
    },
  },
});
