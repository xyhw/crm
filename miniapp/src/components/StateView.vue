<template>
  <view v-if="loading" class="state-loading">
    <view v-for="i in skeletonCount" :key="i" class="state-loading__card">
      <view class="state-loading__avatar" />
      <view class="state-loading__body">
        <view class="state-loading__bar state-loading__bar--70" />
        <view class="state-loading__bar state-loading__bar--40" />
      </view>
    </view>
  </view>

  <view v-else-if="error" class="state-view state-view--error">
    <view class="state-view__title">{{ errorTitle }}</view>
    <view class="state-view__desc">{{ error }}</view>
    <view v-if="retryable" class="state-view__btn" @click="$emit('retry')">重试</view>
  </view>

  <view v-else-if="empty" class="state-view state-view--empty">
    <view class="state-view__title">{{ emptyTitle }}</view>
    <view v-if="emptyDesc" class="state-view__desc">{{ emptyDesc }}</view>
    <view v-if="emptyAction" class="state-view__btn" @click="$emit('action')">{{ emptyAction }}</view>
  </view>

  <slot v-else />
</template>

<script setup>
defineProps({
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  errorTitle: { type: String, default: '加载失败' },
  retryable: { type: Boolean, default: true },
  empty: { type: Boolean, default: false },
  emptyTitle: { type: String, default: '暂无数据' },
  emptyDesc: { type: String, default: '' },
  emptyAction: { type: String, default: '' },
  skeletonCount: { type: Number, default: 3 },
});

defineEmits(['retry', 'action']);
</script>

<style lang="scss" scoped>
.state-loading {
  padding: 16rpx 24rpx;
}

.state-loading__card {
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.state-loading__avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 12rpx;
  background: linear-gradient(90deg, #f0f1f3 25%, #e6e8eb 50%, #f0f1f3 75%);
  background-size: 400% 100%;
  animation: state-shimmer 1.2s infinite;
  flex-shrink: 0;
}

.state-loading__body {
  flex: 1;
  margin-left: 20rpx;
}

.state-loading__bar {
  height: 24rpx;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #f0f1f3 25%, #e6e8eb 50%, #f0f1f3 75%);
  background-size: 400% 100%;
  animation: state-shimmer 1.2s infinite;
}

.state-loading__bar--70 {
  width: 70%;
}

.state-loading__bar--40 {
  width: 40%;
  margin-top: 16rpx;
}

@keyframes state-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}

.state-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 48rpx;
}

.state-view__title {
  color: #1a1a1a;
  font-size: 30rpx;
  font-weight: 500;
}

.state-view__desc {
  margin-top: 16rpx;
  color: #b0b0b0;
  font-size: 26rpx;
  text-align: center;
}

.state-view__btn {
  margin-top: 32rpx;
  padding: 16rpx 56rpx;
  border-radius: 999rpx;
  background: #048c47;
  color: #ffffff;
  font-size: 26rpx;
}

.state-view--error .state-view__title {
  color: #e54848;
}
</style>
