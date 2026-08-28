<template>
  <view class="change-password-page">
    <view class="card">
      <view class="card-title">修改密码</view>
      <view class="form-item">
        <text class="form-label">旧密码</text>
        <input
          v-model="form.oldPassword"
          :password="!visible"
          placeholder="请输入当前密码"
          :maxlength="32"
          class="form-input"
        />
      </view>
      <view class="form-item">
        <text class="form-label">新密码</text>
        <input
          v-model="form.newPassword"
          :password="!visible"
          placeholder="8 位以上，含字母和数字"
          :maxlength="32"
          class="form-input"
        />
      </view>
      <view class="form-item">
        <text class="form-label">确认密码</text>
        <input
          v-model="form.confirmPassword"
          :password="!visible"
          placeholder="请再次输入新密码"
          :maxlength="32"
          class="form-input"
        />
      </view>
      <view class="visible-toggle" @click="visible = !visible">
        {{ visible ? '隐藏密码' : '显示密码' }}
      </view>
    </view>

    <button class="submit-btn" :class="{ disabled: submitting }" :disabled="submitting" @click="handleSubmit">
      {{ submitting ? '提交中...' : '确认修改' }}
    </button>
  </view>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { api } from '@/api/index';
import { useUserStore } from '@/store/user';

const userStore = useUserStore();

const submitting = ref(false);
const visible = ref(false);
const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

async function handleSubmit() {
  if (!form.oldPassword) {
    uni.showToast({ title: '请输入旧密码', icon: 'none' });
    return;
  }
  if (!/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(form.newPassword)) {
    uni.showToast({ title: '新密码至少 8 位，且必须包含字母和数字', icon: 'none' });
    return;
  }
  if (!form.confirmPassword) {
    uni.showToast({ title: '请再次输入新密码', icon: 'none' });
    return;
  }
  if (form.newPassword !== form.confirmPassword) {
    uni.showToast({ title: '两次输入的新密码不一致', icon: 'none' });
    return;
  }
  if (submitting.value) return;
  submitting.value = true;
  try {
    await api.changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword });
    uni.showToast({ title: '密码修改成功，请重新登录', icon: 'success' });
    setTimeout(() => {
      userStore.logout();
    }, 800);
  } catch (e) {
    uni.showToast({ title: e.message || '修改失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}
</script>

<style lang="scss" scoped>
.change-password-page {
  min-height: 100vh;
  padding: 24rpx;
}

.card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx 24rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 24rpx;
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

.visible-toggle {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #048C47;
  text-align: right;
}

.submit-btn {
  margin-top: 32rpx;
  height: 92rpx;
  line-height: 92rpx;
  text-align: center;
  border-radius: 46rpx;
  background: #048C47;
  color: #ffffff;
  font-size: 30rpx;
}

.submit-btn.disabled {
  opacity: 0.6;
}
</style>