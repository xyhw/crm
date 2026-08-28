<template>
  <view class="login-page">
    <view class="login-hero">
      <view class="login-logo">商机互助</view>
      <view class="login-slogan">酒店供应链供应商互助平台</view>
      <view class="login-sub">我为人人，人人为我</view>
    </view>

    <view class="login-form">
      <!-- 微信一键登录 -->
      <button
        class="button-primary login-btn"
        :loading="wxLoading"
        :disabled="submitting"
        @click="handleWechatLogin"
      >
        微信一键登录
      </button>

      <view class="login-divider">
        <view class="divider-line"></view>
        <text class="divider-text">或手机号登录</text>
        <view class="divider-line"></view>
      </view>

      <!-- 手机号 + 密码 -->
      <view class="form-item">
        <text class="form-label">手机号</text>
        <input
          v-model="phoneForm.phone"
          type="number"
          :maxlength="11"
          placeholder="请输入手机号"
          class="form-input"
        />
      </view>
      <view class="form-item">
        <text class="form-label">密码</text>
        <input
          v-model="phoneForm.password"
          :password="true"
          placeholder="请输入密码"
          :maxlength="32"
          class="form-input"
        />
      </view>

      <button
        class="button-primary login-btn"
        :loading="submitting"
        @click="handlePhoneLogin"
      >
        登录
      </button>
      <button class="login-link-btn" @click="goForgot">忘记密码</button>
      <button class="login-link-btn" @click="goRegister">没有账号？立即注册</button>

      <view class="login-agreement">
        登录即代表您已阅读并同意
        <text class="link" @click="goAgreement('agreement')">《用户协议》</text>
        和
        <text class="link" @click="goAgreement('privacy')">《隐私政策》</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/user';
import { api } from '@/api/index';

const userStore = useUserStore();

const submitting = ref(false);
const wxLoading = ref(false);
const phoneForm = ref({ phone: '', password: '' });

// 支持从分享卡片携带邀请码
let inviteCode = '';
onLoad((options) => {
  if (options && options.inviteCode) {
    inviteCode = options.inviteCode;
    uni.setStorageSync('hof_pending_invite', inviteCode);
  }
});

async function handleWechatLogin() {
  wxLoading.value = true;
  try {
    const result = await userStore.wechatLogin();
    if (result.bound) {
      uni.reLaunch({ url: '/pages/index/index' });
    }
  } catch (e) {
    if (e.need_bind && e.openid) {
      uni.navigateTo({
        url: `/pages/login/bind?openid=${encodeURIComponent(e.openid)}`,
      });
    } else if (e.message.includes('微信') || e.message.includes('网络')) {
      uni.showToast({ title: e.message, icon: 'none' });
    } else {
      uni.showToast({ title: e.message || '登录失败', icon: 'none' });
    }
  } finally {
    wxLoading.value = false;
  }
}

async function handlePhoneLogin() {
  if (!/^1\d{10}$/.test(phoneForm.value.phone)) {
    uni.showToast({ title: '请输入正确手机号', icon: 'none' });
    return;
  }
  if (!phoneForm.value.password) {
    uni.showToast({ title: '请输入密码', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    await userStore.login(phoneForm.value.phone, phoneForm.value.password);
    uni.showToast({ title: '登录成功', icon: 'success' });
    uni.reLaunch({ url: '/pages/index/index' });
  } catch (e) {
    uni.showToast({ title: e.message || '登录失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}

function goForgot() {
  uni.navigateTo({ url: '/pages/login/forgot' });
}

function goRegister() {
  uni.navigateTo({ url: '/pages/login/register' });
}

function goAgreement(type) {
  uni.navigateTo({ url: `/pages/common/agreement?type=${type}` });
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
}

.login-hero {
  padding: 120rpx 60rpx 80rpx;
  background: linear-gradient(135deg, #048C47 0%, #036B38 100%);
  color: #ffffff;
}

.login-logo {
  font-size: 56rpx;
  font-weight: 700;
  text-align: center;
}

.login-slogan {
  margin-top: 20rpx;
  font-size: 28rpx;
  text-align: center;
  opacity: 0.95;
}

.login-sub {
  margin-top: 8rpx;
  font-size: 24rpx;
  text-align: center;
  opacity: 0.8;
}

.login-form {
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

.login-btn {
  margin-top: 24rpx;
  width: 100%;
}

.login-link-btn {
  margin-top: 16rpx;
  width: 100%;
  border: none;
  background: transparent;
  color: #048C47;
  font-size: 28rpx;
}

.login-divider {
  display: flex;
  align-items: center;
  margin: 40rpx 0 20rpx;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: #E5E8EB;
}

.divider-text {
  margin: 0 20rpx;
  font-size: 24rpx;
  color: #B0B0B0;
}

.login-agreement {
  margin-top: 40rpx;
  text-align: center;
  font-size: 22rpx;
  color: #B0B0B0;
}

.link {
  color: #048C47;
}
</style>