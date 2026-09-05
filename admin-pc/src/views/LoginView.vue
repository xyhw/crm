<template>
  <div class="login-page">
    <form class="login-card" @submit.prevent="handleLogin">
      <div class="mark">HOF</div>
      <h1>商机管理后台</h1>
      <p class="sub">Hotel Order Follow Admin</p>
      <label class="field">
        <span class="field-label">用户名</span>
        <input v-model="username" class="input" autocomplete="username" />
      </label>
      <label class="field">
        <span class="field-label">密码</span>
        <div class="pw">
          <input
            v-model="password"
            class="input"
            :type="showPwd ? 'text' : 'password'"
            autocomplete="current-password"
          />
          <button class="toggle" type="button" @click="showPwd = !showPwd">{{ showPwd ? '隐藏' : '显示' }}</button>
        </div>
      </label>
      <button class="btn btn-primary submit" type="submit" :disabled="loading">
        {{ loading ? '登录中...' : '登录' }}
      </button>
      <p class="hint">默认账号：admin / admin123</p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';

const router = useRouter();
const auth = useAuthStore();
const toast = useToastStore();
const username = ref('');
const password = ref('');
const showPwd = ref(false);
const loading = ref(false);

async function handleLogin() {
  if (!username.value || !password.value) {
    toast.error('请输入用户名和密码');
    return;
  }
  loading.value = true;
  try {
    await auth.login(username.value, password.value);
    toast.success('登录成功');
    router.replace('/dashboard');
  } catch (e) {
    toast.error(e.message || '登录失败');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  padding: 24px;
}
.login-card {
  width: 400px;
  background: #fff;
  border-radius: 16px;
  padding: 36px 32px 28px;
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.mark {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--color-accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}
h1 {
  margin: 0;
  font-size: 22px;
}
.sub {
  margin: -8px 0 4px;
  color: var(--color-muted-fg);
  font-size: 13px;
}
.pw {
  position: relative;
}
.toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: var(--color-accent);
  font-size: 12px;
  font-weight: 600;
}
.submit {
  height: 40px;
  width: 100%;
  margin-top: 6px;
}
.hint {
  margin: 0;
  text-align: center;
  color: var(--color-muted-fg);
  font-size: 12px;
}
</style>
