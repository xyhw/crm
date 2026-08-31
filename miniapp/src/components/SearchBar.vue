<template>
  <view class="searchbar">
    <view class="searchbar__box">
      <text class="searchbar__icon">搜</text>
      <input
        :value="modelValue"
        class="searchbar__input"
        :placeholder="placeholder"
        confirm-type="search"
        @input="onInput"
        @confirm="onConfirm"
      />
      <view v-if="modelValue" class="searchbar__clear" @click="onClear">✕</view>
    </view>
  </view>
</template>

<script setup>
import { ref, onUnmounted } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '搜索' },
  debounce: { type: Number, default: 400 },
});

const emit = defineEmits(['update:modelValue', 'search', 'clear']);

const timer = ref(null);

function onInput(e) {
  const val = e.detail.value;
  emit('update:modelValue', val);
  if (timer.value) clearTimeout(timer.value);
  timer.value = setTimeout(() => {
    emit('search', val);
  }, props.debounce);
}

function onConfirm(e) {
  if (timer.value) clearTimeout(timer.value);
  emit('search', e.detail.value);
}

function onClear() {
  emit('update:modelValue', '');
  emit('clear');
  if (timer.value) clearTimeout(timer.value);
  emit('search', '');
}

onUnmounted(() => {
  if (timer.value) clearTimeout(timer.value);
});
</script>

<style lang="scss" scoped>
.searchbar {
  width: 100%;
}

.searchbar__box {
  display: flex;
  align-items: center;
  background: #f5f6f7;
  border-radius: 8rpx;
  padding: 0 20rpx;
  height: 64rpx;
}

.searchbar__icon {
  color: #b0b0b0;
  font-size: 24rpx;
  margin-right: 12rpx;
  flex-shrink: 0;
}

.searchbar__input {
  flex: 1;
  font-size: 28rpx;
  color: #1a1a1a;
}

.searchbar__clear {
  width: 36rpx;
  height: 36rpx;
  line-height: 36rpx;
  text-align: center;
  border-radius: 50%;
  background: #d0d0d0;
  color: #fff;
  font-size: 20rpx;
  flex-shrink: 0;
}
</style>
