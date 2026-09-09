<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">HOF</div>
        <div>
          <div class="brand-name">管理后台</div>
          <div class="brand-sub">Hotel Order Follow</div>
        </div>
      </div>
      <nav class="nav">
        <div v-for="group in navGroups" :key="group.title" class="nav-group">
          <div class="nav-group-title">{{ group.title }}</div>
          <router-link
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="nav-item"
            :class="{ active: isActive(item.to) }"
          >
            {{ item.label }}
          </router-link>
        </div>
      </nav>
    </aside>
    <div class="main">
      <header class="topbar">
        <div class="crumb">{{ currentTitle }}</div>
        <div class="top-right">
          <span class="who">{{ auth.displayName }}</span>
          <button class="btn btn-ghost" type="button" @click="openPwd">修改密码</button>
          <button class="btn btn-ghost" type="button" @click="askLogout">退出</button>
        </div>
      </header>
      <main class="content">
        <router-view />
      </main>
    </div>
    <ConfirmDialog
      v-model="logoutOpen"
      title="退出登录"
      content="确认退出当前登录？"
      confirm-text="退出"
      tone="warning"
      @confirm="doLogout"
    />
    <Modal v-model="pwdOpen" title="修改密码" :dirty="pwdDirty">
      <label class="field">
        <span class="field-label">原密码<span class="required">*</span></span>
        <input v-model="pwdForm.oldPassword" class="input" type="password" autocomplete="current-password" @input="pwdDirty = true" />
      </label>
      <label class="field">
        <span class="field-label">新密码<span class="required">*</span></span>
        <input v-model="pwdForm.newPassword" class="input" type="password" autocomplete="new-password" placeholder="至少 8 位" @input="pwdDirty = true" />
      </label>
      <label class="field">
        <span class="field-label">确认新密码<span class="required">*</span></span>
        <input v-model="pwdForm.confirm" class="input" type="password" autocomplete="new-password" @input="pwdDirty = true" />
      </label>
      <p class="field-help">修改成功后需使用新密码重新登录。</p>
      <template #footer>
        <button class="btn btn-primary" type="button" :disabled="pwdSubmitting" @click="askSubmitPwd">
          {{ pwdSubmitting ? '提交中…' : '确认修改' }}
        </button>
      </template>
    </Modal>
    <ConfirmDialog
      v-model="pwdConfirmOpen"
      title="确认修改密码"
      content="修改后当前登录会失效，需使用新密码重新登录。确认继续？"
      confirm-text="确认修改"
      tone="warning"
      @confirm="doSubmitPwd"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import { adminApi } from '../api/client';
import ConfirmDialog from './ConfirmDialog.vue';
import Modal from './Modal.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const toast = useToastStore();
const logoutOpen = ref(false);
const pwdOpen = ref(false);
const pwdConfirmOpen = ref(false);
const pwdSubmitting = ref(false);
const pwdDirty = ref(false);
const pwdForm = ref({ oldPassword: '', newPassword: '', confirm: '' });

const navGroups = [
  {
    title: '总览',
    items: [
      { to: '/dashboard', label: '仪表盘' },
      { to: '/stats', label: '数据统计' },
      { to: '/finance', label: '财务看板' },
    ],
  },
  {
    title: '业务',
    items: [
      { to: '/opportunities', label: '商机管理' },
      { to: '/opportunities/import', label: '批量导入' },
      { to: '/users', label: '用户管理' },
      { to: '/orders', label: '订单管理' },
      { to: '/audit', label: '进度审核' },
    ],
  },
  {
    title: '资金',
    items: [
      { to: '/recharge', label: '充值对账' },
      { to: '/points', label: '积分流水' },
    ],
  },
  {
    title: '运营',
    items: [
      { to: '/announcements', label: '公告管理' },
      { to: '/banners', label: 'Banner 管理' },
      { to: '/notifications', label: '通知推送' },
      { to: '/categories', label: '分类管理' },
      { to: '/tags', label: '标签管理' },
    ],
  },
  {
    title: '系统',
    items: [
      { to: '/configs', label: '系统配置' },
      { to: '/agreements', label: '协议内容' },
      { to: '/levels', label: '等级配置' },
      { to: '/roles', label: '角色权限' },
      { to: '/admins', label: '管理员' },
      { to: '/audit-logs', label: '操作日志' },
    ],
  },
];

const currentTitle = computed(() => route.meta.title || '管理后台');

function isActive(to) {
  if (to === '/opportunities') return route.path === '/opportunities';
  return route.path === to || route.path.startsWith(to + '/');
}

function askLogout() {
  logoutOpen.value = true;
}

function doLogout() {
  auth.logout();
  router.replace('/login');
}

function openPwd() {
  pwdForm.value = { oldPassword: '', newPassword: '', confirm: '' };
  pwdDirty.value = false;
  pwdOpen.value = true;
}

function askSubmitPwd() {
  const { oldPassword, newPassword, confirm } = pwdForm.value;
  if (!oldPassword || !newPassword || !confirm) {
    toast.error('请填写完整');
    return;
  }
  if (newPassword.length < 8) {
    toast.error('新密码至少 8 位');
    return;
  }
  if (newPassword !== confirm) {
    toast.error('两次输入的新密码不一致');
    return;
  }
  if (newPassword === oldPassword) {
    toast.error('新密码不能与原密码相同');
    return;
  }
  pwdConfirmOpen.value = true;
}

async function doSubmitPwd() {
  pwdSubmitting.value = true;
  try {
    await adminApi.changePassword({
      oldPassword: pwdForm.value.oldPassword,
      newPassword: pwdForm.value.newPassword,
    });
    pwdOpen.value = false;
    pwdDirty.value = false;
    toast.success('密码已修改，请重新登录');
    auth.logout();
    router.replace('/login');
  } catch (e) {
    toast.error(e.message);
  } finally {
    pwdSubmitting.value = false;
  }
}
</script>

<style scoped>
.shell {
  display: flex;
  min-height: 100vh;
}
.sidebar {
  width: var(--sidebar-width);
  background: var(--color-primary);
  color: #fff;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: auto;
  flex-shrink: 0;
}
.brand {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 20px 18px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 12px;
}
.brand-name {
  font-weight: 700;
  font-size: 14px;
}
.brand-sub {
  font-size: 11px;
  color: #94a3b8;
}
.nav {
  padding: 12px 10px 24px;
}
.nav-group {
  margin-bottom: 16px;
}
.nav-group-title {
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #94a3b8;
  text-transform: uppercase;
}
.nav-item {
  display: block;
  padding: 8px 10px;
  border-radius: 8px;
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 2px;
  transition: background 160ms ease, color 160ms ease;
}
.nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}
.nav-item.active {
  background: rgba(3, 105, 161, 0.35);
  color: #fff;
}
.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.topbar {
  height: var(--header-height);
  background: #fff;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 10;
}
.crumb {
  font-weight: 700;
  font-size: 15px;
}
.top-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.who {
  color: var(--color-muted-fg);
  font-size: 13px;
}
.content {
  flex: 1;
}
</style>
