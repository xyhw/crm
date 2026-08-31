<template>
  <view v-if="visible" class="confirm-mask" @click="onMask">
    <view class="confirm-box" @click.stop>
      <view class="confirm-title">{{ title }}</view>
      <view class="confirm-content">{{ content }}</view>
      <view v-if="desc" class="confirm-desc">{{ desc }}</view>
      <view class="confirm-actions">
        <view class="confirm-btn confirm-btn--cancel" @click="onCancel">{{ cancelText }}</view>
        <view class="confirm-btn confirm-btn--ok" :class="`confirm-btn--${tone}`" @click="onConfirm">{{ confirmText }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '提示' },
  content: { type: String, default: '' },
  desc: { type: String, default: '' },
  confirmText: { type: String, default: '确定' },
  cancelText: { type: String, default: '取消' },
  tone: { type: String, default: 'primary' },
});

const emit = defineEmits(['confirm', 'cancel', 'update:visible']);

function onConfirm() {
  emit('confirm');
  emit('update:visible', false);
}

function onCancel() {
  emit('cancel');
  emit('update:visible', false);
}

function onMask() {
  emit('cancel');
  emit('update:visible', false);
}
</script>

<style lang="scss" scoped>
.confirm-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.confirm-box {
  width: 560rpx;
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}

.confirm-title {
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  padding: 40rpx 32rpx 12rpx;
}

.confirm-content {
  text-align: center;
  font-size: 28rpx;
  color: #333;
  padding: 0 32rpx 16rpx;
  line-height: 1.6;
}

.confirm-desc {
  text-align: center;
  font-size: 24rpx;
  color: #b0b0b0;
  padding: 0 32rpx 24rpx;
}

.confirm-actions {
  display: flex;
  border-top: 1px solid #f0f0f0;
}

.confirm-btn {
  flex: 1;
  text-align: center;
  padding: 28rpx 0;
  font-size: 30rpx;
}

.confirm-btn--cancel {
  color: #666;
  border-right: 1px solid #f0f0f0;
}

.confirm-btn--ok {
  color: #048C47;
  font-weight: 600;
}

.confirm-btn--danger {
  color: #e54848;
  font-weight: 600;
}

.confirm-btn--warning {
  color: #e8920a;
  font-weight: 600;
}
</style>
