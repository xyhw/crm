<template>
  <view class="bind-page">
    <view class="bind-tip">
      为保障账号安全与跟单权益互通，请绑定手机号<br />
      已注册手机号将自动关联，未注册将创建新账号
    </view>

    <button
      class="button-primary bind-btn"
      :loading="binding"
      :disabled="binding"
      open-type="getPhoneNumber"
      @getphonenumber="handleGetPhone"
    >
      授权微信手机号
    </button>

    <view class="bind-nick">
      <view class="form-item">
        <text class="form-label">昵称</text>
        <input
          v-model="form.nickname"
          placeholder="给自己起个昵称（必填）"
          :maxlength="20"
          class="form-input"
        />
      </view>
    </view>

    <button class="bind-link-btn" @click="manualBind">
      使用其他手机号（短信验证）
    </button>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/user';
import { api } from '@/api/index';

const userStore = useUserStore();

let openid = '';
const binding = ref(false);
const form = ref({ nickname: '' });

onLoad((options) => {
  if (options && options.openid) {
    openid = decodeURIComponent(options.openid);
  }
});

async function handleGetPhone(e) {
  const detail = e.detail || {};
  if (detail.errMsg && !detail.errMsg.includes('getPhoneNumber:ok')) {
    uni.showToast({ title: '已取消授权手机号', icon: 'none' });
    return;
  }
  const code = detail.code;
  if (!code) {
    uni.showToast({ title: '未获取到手机号授权，请重试', icon: 'none' });
    return;
  }
  if (!form.value.nickname.trim()) {
    uni.showToast({ title: '请填写昵称', icon: 'none' });
    return;
  }

  binding.value = true;
  try {
    const inviteCode = uni.getStorageSync('hof_pending_invite') || '';
    await userStore.bindPhone({
      phoneCode: code,
      openid,
      nickname: form.value.nickname.trim(),
      inviteCode,
    });
    uni.removeStorageSync('hof_pending_invite');
    uni.showToast({ title: '绑定成功', icon: 'success' });
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/index/index' });
    }, 800);
  } catch (e) {
    uni.showToast({ title: e.message || '绑定失败', icon: 'none' });
  } finally {
    binding.value = false;
  }
}

function manualBind() {
  // 短信验证码绑定为后续增强：#ifdef 预留，先复用密码登录绑定流程
  uni.showToast({ title: '请先完成手机号授权绑定', icon: 'none' });
}
</script>

<style lang="scss" scoped>
.bind-page {
  min-height: 100vh;
  padding: 60rpx;
}

.bind-tip {
  text-align: center;
  font-size: 28rpx;
  color: #7A7A7A;
  line-height: 1.8;
  margin-bottom: 60rpx;
}

.bind-btn {
  width: 100%;
}

.bind-nick {
  margin-top: 40rpx;
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

.bind-link-btn {
  margin-top: 24rpx;
  width: 100%;
  border: none;
  background: transparent;
  color: #048C47;
  font-size: 28rpx;
}
</style>