<template>
  <view v-if="pageCount > 1" class="pagination">
    <view class="pagination__inner">
      <view class="pagination__btn" :class="{ disabled: page <= 1 }" @click="go(page - 1)">上一页</view>
      <view class="pagination__nums">
        <template v-for="p in pageNumbers" :key="p">
          <text v-if="p === '...'" class="pagination__ellipsis">...</text>
          <view
            v-else
            class="pagination__num"
            :class="{ active: p === page }"
            @click="go(p)"
          >{{ p }}</view>
        </template>
      </view>
      <view class="pagination__btn" :class="{ disabled: page >= pageCount }" @click="go(page + 1)">下一页</view>
    </view>
    <view class="pagination__total">共 {{ total }} 条</view>
  </view>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  page: { type: Number, default: 1 },
  pageCount: { type: Number, default: 1 },
  total: { type: Number, default: 0 },
});

const emit = defineEmits(['change']);

const pageNumbers = computed(() => {
  const total = props.pageCount;
  const cur = props.page;
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const nums = [];
  nums.push(1);
  const left = Math.max(2, cur - 2);
  const right = Math.min(total - 1, cur + 2);
  if (left > 2) nums.push('...');
  for (let i = left; i <= right; i += 1) nums.push(i);
  if (right < total - 1) nums.push('...');
  nums.push(total);
  return nums;
});

function go(p) {
  if (p < 1 || p > props.pageCount || p === props.page) return;
  emit('change', p);
}
</script>

<style lang="scss" scoped>
.pagination {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  padding: 12rpx 24rpx calc(12rpx + env(safe-area-inset-bottom));
  z-index: 90;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.pagination__inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.pagination__btn {
  min-height: 88rpx; line-height: 88rpx; padding: 0 24rpx;
  border-radius: 8rpx;
  border: 1px solid #037539;
  color: #037539;
  font-size: 24rpx;
  flex-shrink: 0;
}

.pagination__btn.disabled {
  border-color: #e0e0e0;
  color: #999;
}

.pagination__nums {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.pagination__num {
  min-width: 56rpx;
  height: 56rpx;
  line-height: 56rpx;
  text-align: center;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #333;
  border: 1px solid transparent;
}

.pagination__num.active {
  background: #037539;
  color: #fff;
  font-weight: 600;
}

.pagination__ellipsis {
  color: #999;
  padding: 0 4rpx;
  font-size: 26rpx;
}

.pagination__total {
  text-align: center;
  font-size: 22rpx;
  color: #b0b0b0;
  margin-top: 8rpx;
}
</style>
