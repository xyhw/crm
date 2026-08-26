<template>
  <view class="level-page">
    <view v-if="loading" class="empty">加载中...</view>
    <template v-else>
      <!-- 当前等级卡片 -->
      <view class="level-card" :style="{ background: currentLevel.color }">
        <view class="level-card__name">{{ currentLevel.label }}</view>
        <view class="level-card__discount">{{ currentLevel.discount }}</view>
      </view>

      <!-- 维度进度 -->
      <view class="section-card">
        <view class="dim-row"><text class="dim-label">投稿购买率</text><text class="dim-value">{{ level.purchase_rate || 0 }}%</text></view>
        <view class="dim-row"><text class="dim-label">投稿无效率</text><text class="dim-value">{{ level.invalid_rate || 0 }}%</text></view>
        <view class="dim-row"><text class="dim-label">共享有用率</text><text class="dim-value">{{ level.helpful_rate || 0 }}%</text></view>
        <view class="dim-row"><text class="dim-label">活跃度得分</text><text class="dim-value">{{ level.activity_score || 0 }}</text></view>
        <view class="dim-row"><text class="dim-label">综合得分</text><text class="dim-value">{{ level.composite_score || 0 }}</text></view>
      </view>

      <!-- 等级说明 -->
      <view class="section-title">等级说明</view>
      <view class="section-card">
        <view
          v-for="(l, i) in levels"
          :key="l.key"
          class="level-item"
          :class="i <= currentIndex ? 'level-item--active' : 'level-item--locked'"
        >
          <view class="level-item__header">
            <text class="level-item__tag" :style="{ background: l.color }">{{ l.label }}</text>
            <text class="level-item__discount">{{ l.discount }}</text>
          </view>
          <view class="level-item__desc">晋升条件：{{ l.threshold }}</view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { api } from '@/api/index';
import { LEVEL_META } from '@/common/constants';

const loading = ref(true);
const stats = ref(null);

onLoad(() => {
  api.myStats()
    .then((res) => {
      stats.value = res || null;
    })
    .catch(() => {})
    .finally(() => {
      loading.value = false;
    });
});

const level = computed(() => stats.value?.level || {});
const currentLevel = computed(() => LEVEL_META[level.value.level] || LEVEL_META.normal);
const currentIndex = computed(() => levels.findIndex((l) => l.key === level.level));

const levels = [
  { key: 'normal', ...LEVEL_META.normal, threshold: '注册即获得' },
  { key: 'silver', ...LEVEL_META.silver, threshold: '投稿购买率≥30%，无效率≤10%' },
  { key: 'gold', ...LEVEL_META.gold, threshold: '投稿购买率≥50%，无效率≤5%' },
  { key: 'expert', ...LEVEL_META.expert, threshold: '投稿购买率≥70%，无效率≤3%' },
];
</script>

<style lang="scss" scoped>
.level-page {
  min-height: 100vh;
}

.empty {
  text-align: center;
  padding: 120rpx 0;
  color: #B0B0B0;
  font-size: 28rpx;
}

.level-card {
  margin: 24rpx;
  border-radius: 16rpx;
  padding: 60rpx 0;
  text-align: center;
  color: #ffffff;
}

.level-card__name {
  font-size: 44rpx;
  font-weight: 700;
}

.level-card__discount {
  margin-top: 12rpx;
  font-size: 30rpx;
  opacity: 0.95;
}

.section-card {
  margin: 0 24rpx 16rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.section-title {
  margin: 8rpx 32rpx 16rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.dim-row {
  display: flex;
  justify-content: space-between;
  padding: 14rpx 0;
}

.dim-label {
  font-size: 26rpx;
  color: #4A4A4A;
}

.dim-value {
  font-size: 26rpx;
  color: #1A1A1A;
  font-weight: 600;
}

.level-item {
  padding: 20rpx 0;
  border-bottom: 1px solid #F2F4F5;
}

.level-item:last-child {
  border-bottom: none;
}

.level-item--locked {
  opacity: 0.5;
}

.level-item__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.level-item__tag {
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  color: #ffffff;
  font-size: 24rpx;
}

.level-item__discount {
  font-size: 26rpx;
  color: #4A4A4A;
}

.level-item__desc {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #7A7A7A;
}
</style>