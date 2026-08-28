<template>
  <view class="register-page">
    <view class="register-hero">
      <view class="register-logo">注册账号</view>
      <view class="register-slogan">加入酒店供应链互助生态</view>
    </view>

    <view class="register-form">
      <view class="form-item">
        <text class="form-label">手机号</text>
        <input
          v-model="form.phone"
          type="number"
          :maxlength="11"
          placeholder="请输入手机号"
          class="form-input"
        />
      </view>
      <view class="form-item">
        <text class="form-label">昵称</text>
        <input v-model="form.nickname" placeholder="如：装修张工" :maxlength="20" class="form-input" />
      </view>
      <view class="form-item">
        <text class="form-label">邮箱</text>
        <input v-model="form.email" placeholder="用于找回密码" class="form-input" />
      </view>
      <view class="form-item">
        <text class="form-label">公司（选填）</text>
        <input v-model="form.company" placeholder="公司名称" :maxlength="50" class="form-input" />
      </view>
      <view class="form-item" @click="showCategory = true">
        <text class="form-label">供应商类型</text>
        <view class="form-input form-picker">
          <text>{{ categoryLabel(form.category) }}</text>
          <text class="picker-arrow">›</text>
        </view>
      </view>
      <view class="form-item">
        <text class="form-label">密码</text>
        <input
          v-model="form.password"
          :password="true"
          placeholder="8 位以上，含字母和数字"
          :maxlength="32"
          class="form-input"
        />
      </view>
      <view v-if="inviteCode" class="invite-tip">邀请码：{{ inviteCode }}</view>

      <button class="button-primary register-btn" :loading="submitting" :disabled="submitting" @click="handleRegister">
        {{ submitting ? '注册中...' : '注册' }}
      </button>
      <button class="register-link-btn" @click="goLogin">已有账号？去登录</button>

      <view class="register-agreement">
        注册即代表您已阅读并同意
        <text class="link" @click="goAgreement('agreement')">《用户协议》</text>
        和
        <text class="link" @click="goAgreement('privacy')">《隐私政策》</text>
      </view>
    </view>

    <!-- 供应商类型选择器 -->
    <view v-if="showCategory" class="modal-mask" @click.self="showCategory = false">
      <view class="picker-modal">
        <view class="picker-header">
          <text class="picker-cancel" @click="showCategory = false">取消</text>
          <text class="picker-title">选择供应商类型</text>
          <text class="picker-confirm" @click="showCategory = false">完成</text>
        </view>
        <scroll-view scroll-y class="picker-body" :scroll-into-view="'cat-' + form.category" scroll-with-animation>
          <view
            v-for="c in SUPPLIER_CATEGORIES"
            :key="c.value"
            :id="'cat-' + c.value"
            class="picker-item"
            :class="{ active: form.category === c.value }"
            @click="selectCategory(c.value)"
          >
            <text>{{ c.label }}</text>
            <text v-if="form.category === c.value" class="picker-check">✓</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/user';
import { SUPPLIER_CATEGORIES, categoryLabel } from '@/common/constants';

const userStore = useUserStore();

const submitting = ref(false);
const showCategory = ref(false);
const inviteCode = ref('');

const form = reactive({
  phone: '',
  nickname: '',
  email: '',
  company: '',
  category: SUPPLIER_CATEGORIES[0].value,
  password: '',
});

onLoad((options) => {
  // 分享卡片/邀请页携带邀请码优先，其次消费登录页暂存
  const fromParam = options && options.inviteCode;
  const fromStorage = uni.getStorageSync('hof_pending_invite') || '';
  inviteCode.value = fromParam || fromStorage;
});

async function handleRegister() {
  if (!/^1\d{10}$/.test(form.phone)) {
    uni.showToast({ title: '请输入正确手机号', icon: 'none' });
    return;
  }
  if (!form.nickname.trim()) {
    uni.showToast({ title: '请填写昵称', icon: 'none' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    uni.showToast({ title: '请输入正确邮箱', icon: 'none' });
    return;
  }
  if (!/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(form.password)) {
    uni.showToast({ title: '密码至少 8 位，且必须包含字母和数字', icon: 'none' });
    return;
  }
  if (submitting.value) return;
  submitting.value = true;
  try {
    await userStore.register({
      phone: form.phone,
      password: form.password,
      nickname: form.nickname.trim(),
      email: form.email.trim(),
      company: form.company.trim(),
      category: form.category,
      inviteCode: inviteCode.value || undefined,
    });
    uni.removeStorageSync('hof_pending_invite');
    uni.showToast({ title: '注册成功', icon: 'success' });
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/index/index' });
    }, 800);
  } catch (e) {
    uni.showToast({ title: e.message || '注册失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}

function goLogin() {
  uni.navigateBack();
}

function selectCategory(value) {
  form.category = value;
  showCategory.value = false;
}

function goAgreement(type) {
  uni.navigateTo({ url: `/pages/common/agreement?type=${type}` });
}
</script>

<style lang="scss" scoped>
.register-page {
  min-height: 100vh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
}

.register-hero {
  padding: 80rpx 60rpx 60rpx;
  background: linear-gradient(135deg, #048C47 0%, #036B38 100%);
  color: #ffffff;
}

.register-logo {
  font-size: 48rpx;
  font-weight: 700;
  text-align: center;
}

.register-slogan {
  margin-top: 16rpx;
  font-size: 26rpx;
  text-align: center;
  opacity: 0.9;
}

.register-form {
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

.form-picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.picker-arrow {
  color: #B0B0B0;
  font-size: 32rpx;
}

.invite-tip {
  font-size: 24rpx;
  color: #048C47;
  margin-bottom: 16rpx;
}

.register-btn {
  margin-top: 32rpx;
  width: 100%;
}

.register-link-btn {
  margin-top: 16rpx;
  width: 100%;
  border: none;
  background: transparent;
  color: #048C47;
  font-size: 28rpx;
}

.register-agreement {
  margin-top: 40rpx;
  text-align: center;
  font-size: 22rpx;
  color: #B0B0B0;
}

.link {
  color: #048C47;
}

/* 供应商类型选择器（与 profile/edit 同规格） */
.modal-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: flex-end;
}

.picker-modal {
  width: 100%;
  background: #ffffff;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 60vh;
  padding-bottom: env(safe-area-inset-bottom);
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1px solid #F2F4F5;
}

.picker-cancel {
  color: #7A7A7A;
  font-size: 28rpx;
}

.picker-title {
  font-size: 30rpx;
  font-weight: 600;
}

.picker-confirm {
  color: #048C47;
  font-size: 28rpx;
}

.picker-body {
  max-height: 50vh;
}

.picker-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 32rpx;
  font-size: 28rpx;
  color: #1A1A1A;
  border-bottom: 1px solid #F7F8F9;
}

.picker-item.active {
  color: #048C47;
  font-weight: 600;
  background: #F3FBF6;
}

.picker-check {
  color: #048C47;
  font-size: 32rpx;
}
</style>