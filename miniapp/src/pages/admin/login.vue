<template>
  <view class="admin-login">
    <view class="login-box">
      <view class="login-title">商机管理后台</view>
      <view class="login-sub">Hotel Order Follow Admin</view>
      <view class="login-form">
        <input
          v-model="username"
          class="login-input"
          placeholder="用户名"
          placeholder-class="input-ph"
        />
        <input
          v-model="password"
          class="login-input"
          type="password"
          placeholder="密码"
          placeholder-class="input-ph"
        />
        <view class="login-btn" :class="{ disabled: loading }" @click="handleLogin">
          {{ loading ? '登录中...' : '登录' }}
        </view>
      </view>
      <view class="login-tip">默认账号：admin / admin123</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { adminApi, setAdminAuth } from '@/admin/adminApi';

const username = ref('');
const password = ref('');
const loading = ref(false);

async function handleLogin() {
  if (!username.value || !password.value) {
    uni.showToast({ title: '请输入用户名和密码', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    const res = await adminApi.login({ username: username.value, password: password.value });
    setAdminAuth(res.token, res.admin);
    uni.showToast({ title: '登录成功', icon: 'success' });
    uni.reLaunch({ url: '/pages/admin/index' });
  } catch (e) {
    uni.showToast({ title: e.message || '登录失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.admin-login {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #F0F2F5;
  padding: 0 40rpx;
}
.login-box {
  width: 100%;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 64rpx 48rpx;
}
.login-title {
  text-align: center;
  font-size: 40rpx;
  font-weight: 600;
  color: #1A1A1A;
}
.login-sub {
  text-align: center;
  font-size: 24rpx;
  color: #999999;
  margin: 12rpx 0 48rpx;
}
.login-input {
  height: 88rpx;
  background: #F7F8F9;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  margin-bottom: 24rpx;
  border: 1px solid #EEEEEE;
}
.input-ph {
  color: #B0B0B0;
}
.login-btn {
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  background: #048C47;
  color: #ffffff;
  font-size: 30rpx;
  border-radius: 12rpx;
  margin-top: 16rpx;
}
.login-btn.disabled {
  opacity: 0.6;
}
.login-tip {
  text-align: center;
  font-size: 24rpx;
  color: #B0B0B0;
  margin-top: 32rpx;
}
</style>