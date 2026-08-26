<template>
  <view class="forgot-page">
    <view class="forgot-hero">
      <view class="forgot-logo">找回密码</view>
      <view class="forgot-slogan">输入注册邮箱，验证码将发送至该邮箱</view>
    </view>

    <view class="forgot-form">
      <view class="form-item">
        <text class="form-label">邮箱</text>
        <input
          v-model="form.email"
          type="text"
          placeholder="请输入注册邮箱"
          :maxlength="64"
          class="form-input"
        />
      </view>

      <view class="form-item">
        <text class="form-label">验证码</text>
        <view class="form-row">
          <input
            v-model="form.code"
            type="number"
            placeholder="请输入邮箱收到的验证码"
            :maxlength="6"
            class="form-input form-input--flex"
          />
          <button
            class="send-code-btn"
            :disabled="countdown > 0 || sending"
            @click="handleSendCode"
          >
            {{ sending ? '发送中...' : countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
          </button>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">新密码</text>
        <input
          v-model="form.newPassword"
          :password="true"
          placeholder="8 位以上，含字母和数字"
          :maxlength="32"
          class="form-input"
        />
      </view>

      <button class="button-primary submit-btn" :loading="submitting" @click="handleSubmit">
        重置密码
      </button>

      <view class="back-link" @click="goLogin">想起密码了？去登录</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { api } from '@/api/index';

const COUNTDOWN = 60;

const form = ref({ email: '', code: '', newPassword: '' });
const submitting = ref(false);
const sending = ref(false);
const countdown = ref(0);
let timer = null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PWD_RE = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

function startCountdown() {
  countdown.value = COUNTDOWN;
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) {
      clearInterval(timer);
      timer = null;
    }
  }, 1000);
}

async function handleSendCode() {
  if (!EMAIL_RE.test(form.value.email)) {
    uni.showToast({ title: '请输入正确的邮箱', icon: 'none' });
    return;
  }
  if (sending.value || countdown.value > 0) return;
  sending.value = true;
  try {
    await api.sendResetCode({ email: form.value.email });
    uni.showToast({ title: '验证码已发送至该邮箱', icon: 'none' });
    startCountdown();
  } catch (e) {
    uni.showToast({ title: e.message || '发送失败', icon: 'none' });
  } finally {
    sending.value = false;
  }
}

async function handleSubmit() {
  if (!EMAIL_RE.test(form.value.email)) {
    uni.showToast({ title: '请输入正确的邮箱', icon: 'none' });
    return;
  }
  if (!form.value.code) {
    uni.showToast({ title: '请输入验证码', icon: 'none' });
    return;
  }
  if (!PWD_RE.test(form.value.newPassword)) {
    uni.showToast({ title: '密码至少 8 位，且必须包含字母和数字', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    await api.resetPassword({
      email: form.value.email,
      code: form.value.code,
      newPassword: form.value.newPassword,
    });
    uni.showToast({ title: '密码重置成功', icon: 'success' });
    setTimeout(() => {
      uni.redirectTo({ url: '/pages/login/index' });
    }, 800);
  } catch (e) {
    uni.showToast({ title: e.message || '重置失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}

function goLogin() {
  uni.redirectTo({ url: '/pages/login/index' });
}
</script>

<style lang="scss" scoped>
.forgot-page {
  min-height: 100vh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
}

.forgot-hero {
  padding: 120rpx 60rpx 80rpx;
  background: linear-gradient(135deg, #048C47 0%, #036B38 100%);
  color: #ffffff;
  text-align: center;
}

.forgot-logo {
  font-size: 48rpx;
  font-weight: 700;
}

.forgot-slogan {
  margin-top: 16rpx;
  font-size: 26rpx;
  opacity: 0.9;
}

.forgot-form {
  padding: 40rpx 60rpx;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 24rpx;
  color: #7A7A7A;
  margin-bottom: 8rpx;
}

.form-input {
  height: 88rpx;
  line-height: 88rpx;
  padding: 0 20rpx;
  background: #F2F4F5;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.form-row {
  display: flex;
  align-items: center;
}

.form-input--flex {
  flex: 1;
}

.send-code-btn {
  margin-left: 16rpx;
  min-width: 220rpx;
  height: 88rpx;
  line-height: 88rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
  border: none;
  background: #E4F7EC;
  color: #048C47;
  border-radius: 12rpx;
}

.send-code-btn[disabled] {
  opacity: 0.6;
}

.submit-btn {
  margin-top: 32rpx;
  width: 100%;
}

.back-link {
  margin-top: 32rpx;
  text-align: center;
  font-size: 26rpx;
  color: #048C47;
}
</style>