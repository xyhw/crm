<template>
  <view class="result-page">
    <view class="result-icon" :style="{ background: meta.bg, color: meta.color }">
      <text class="result-symbol">{{ meta.symbol }}</text>
    </view>
    <view class="result-title">{{ meta.title }}</view>
    <view class="result-desc">{{ meta.desc }}</view>

    <view class="result-btn" :class="status === 'success' ? 'btn-primary' : 'btn-danger'" @click="handleAction">
      {{ status === 'success' ? '回到积分中心' : '重新充值' }}
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

const status = ref('success');
const message = ref('');

const meta = computed(() => {
  const map = {
    success: {
      title: '充值成功',
      desc: '积分已到账，请查收',
      symbol: '✓',
      color: '#048C47',
      bg: '#E4F7EC',
    },
    failed: {
      title: '支付失败',
      desc: message.value || '您的这笔支付未能完成，积分未到账，可重新发起充值',
      symbol: '×',
      color: '#E54848',
      bg: '#FDECEC',
    },
    expired: {
      title: '支付超时',
      desc: message.value || '订单已超时失效，请在有效期(30分钟)内完成支付',
      symbol: '!',
      color: '#E8920A',
      bg: '#FFF4E0',
    },
  };
  return map[status.value] || map.expired;
});

onLoad((options) => {
  status.value = options.status || 'success';
  message.value = options.message ? decodeURIComponent(options.message) : '';
});

function handleAction() {
  if (status.value === 'success') {
    uni.reLaunch({ url: '/pages/points/index' });
  } else {
    uni.redirectTo({ url: '/pages/points/recharge' });
  }
}
</script>

<style lang="scss" scoped>
.result-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;
}

.result-icon {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-symbol {
  font-size: 72rpx;
  font-weight: 700;
}

.result-title {
  font-size: 40rpx;
  font-weight: 600;
  color: #1A1A1A;
  margin-top: 32rpx;
}

.result-desc {
  font-size: 26rpx;
  color: #7A7A7A;
  line-height: 1.6;
  text-align: center;
  margin-top: 16rpx;
  padding: 0 48rpx;
}

.result-btn {
  margin: 64rpx 24rpx 0;
  width: calc(100% - 48rpx);
  height: 92rpx;
  line-height: 92rpx;
  text-align: center;
  border-radius: 46rpx;
  color: #ffffff;
  font-size: 30rpx;
}

.btn-primary {
  background: #048C47;
}

.btn-danger {
  background: #E54848;
}
</style>