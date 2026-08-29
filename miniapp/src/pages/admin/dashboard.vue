<template>
  <view class="dash-page">
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else>
      <view class="stat-grid">
        <view v-for="card in statCards" :key="card.title" class="stat-card">
          <view class="stat-title">{{ card.title }}</view>
          <view class="stat-value" :style="{ color: card.color }">{{ card.value }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/admin/adminApi';

const stats = ref(null);
const loading = ref(true);

const statCards = [
  { title: '用户总数', key: 'totalUsers', color: '#048C47' },
  { title: '商机总数', key: 'totalOpportunities', color: '#048C47' },
  { title: '订单总数', key: 'totalOrders', color: '#E8920A' },
  { title: '积分总量', key: 'totalPoints', color: '#E54848' },
];

async function load() {
  loading.value = true;
  try {
    stats.value = await adminApi.getDashboard();
  } catch (e) {
    uni.showToast({ title: e.message || '获取失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

onShow(load);
</script>

<style lang="scss" scoped>
.dash-page {
  min-height: 100vh;
  background: #F2F4F5;
  padding: 24rpx;
}
.stat-grid {
  display: flex;
  flex-wrap: wrap;
}
.stat-card {
  width: 48%;
  margin-bottom: 16rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx 24rpx;
}
.stat-card:nth-child(odd) {
  margin-right: 4%;
}
.stat-title {
  font-size: 26rpx;
  color: #7A7A7A;
  margin-bottom: 16rpx;
}
.stat-value {
  font-size: 48rpx;
  font-weight: 600;
}
</style>