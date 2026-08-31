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
        <view class="password-wrap">
          <input
            v-model="password"
            class="login-input"
            :type="passwordVisible ? 'text' : 'password'"
            placeholder="密码"
            placeholder-class="input-ph"
          />
          <text class="password-toggle" @click="passwordVisible = !passwordVisible">{{ passwordVisible ? '隐藏' : '显示' }}</text>
        </view>
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
const passwordVisible = ref(false);
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
  min-height: 100dvh;
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
  border: 1px solid #DDDEEE;
}
.input-ph {
  color: #666666;
}
.login-btn {
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  background: #037539;
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
  color: #666666;
  margin-top: 32rpx;
}
.password-wrap { position: relative; }
.password-toggle { position: absolute; right: 20rpx; top: 50%; transform: translateY(-50%); font-size: 24rpx; color: #037539; padding: 12rpx; line-height: 1; }
</style>