<template>
  <view class="stats-page">
    <view class="stat-grid">
      <view class="stat-card"><text class="stat-value">{{ dashboard.totalUsers || 0 }}</text><text class="stat-label">总用户</text></view>
      <view class="stat-card"><text class="stat-value">{{ dashboard.totalOpportunities || 0 }}</text><text class="stat-label">总商机</text></view>
      <view class="stat-card"><text class="stat-value">{{ dashboard.totalOrders || 0 }}</text><text class="stat-label">总订单</text></view>
      <view class="stat-card"><text class="stat-value">{{ dashboard.totalPoints || 0 }}</text><text class="stat-label">总积分</text></view>
      <view class="stat-card"><text class="stat-value">{{ dashboard.todayOrders || 0 }}</text><text class="stat-label">今日订单</text></view>
      <view class="stat-card"><text class="stat-value">{{ dashboard.todayRevenue || 0 }}</text><text class="stat-label">今日收入(积分)</text></view>
    </view>

    <view class="section">
      <view class="section-title">近7天趋势</view>
      <view class="trend-card">
        <view class="trend-title">新用户</view>
        <view class="trend-row">
          <view v-for="(d, i) in trends.users || []" :key="i" class="trend-item">
            <text class="trend-count">{{ d.count }}</text>
            <text class="trend-date">{{ d.date }}</text>
          </view>
        </view>
      </view>
      <view class="trend-card">
        <view class="trend-title">新商机</view>
        <view class="trend-row">
          <view v-for="(d, i) in trends.opportunities || []" :key="i" class="trend-item">
            <text class="trend-count">{{ d.count }}</text>
            <text class="trend-date">{{ d.date }}</text>
          </view>
        </view>
      </view>
      <view class="trend-card">
        <view class="trend-title">收入</view>
        <view class="trend-row">
          <view v-for="(d, i) in trends.revenue || []" :key="i" class="trend-item">
            <text class="trend-count">{{ d.amount }}</text>
            <text class="trend-date">{{ d.date }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">分布统计</view>
      <view class="dist-card">
        <view class="dist-title">商机分类分布</view>
        <view v-for="(d, i) in distribution.oppCategories || []" :key="i" class="dist-row">
          <text>{{ d.name }}</text><text class="dist-count">{{ d.count }}</text>
        </view>
      </view>
      <view class="dist-card">
        <view class="dist-title">用户等级分布</view>
        <view v-for="(d, i) in distribution.levelDist || []" :key="i" class="dist-row">
          <text>{{ d.level }}</text><text class="dist-count">{{ d.count }}</text>
        </view>
      </view>
      <view class="dist-card">
        <view class="dist-title">价格区间分布</view>
        <view v-for="(d, i) in distribution.priceDist || []" :key="i" class="dist-row">
          <text>{{ d.price_range }}</text><text class="dist-count">{{ d.count }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { reactive } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/admin/adminApi';

const dashboard = reactive({});
const trends = reactive({});
const distribution = reactive({});

onShow(async () => {
  try {
    const [d, t, dist] = await Promise.all([
      adminApi.getDashboard(),
      adminApi.getTrends(),
      adminApi.getDistribution(),
    ]);
    Object.assign(dashboard, d || {});
    Object.assign(trends, t || {});
    Object.assign(distribution, dist || {});
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  }
});
</script>

<style lang="scss" scoped>
.stats-page { min-height: 100dvh; background: #F2F4F5; padding: 16rpx 24rpx; }
.stat-grid { display: flex; flex-wrap: wrap; justify-content: space-between; }
.stat-card { width: 31%; background: #fff; border-radius: 16rpx; padding: 24rpx 0; margin-bottom: 16rpx; display: flex; flex-direction: column; align-items: center; }
.stat-value { font-size: 36rpx; font-weight: 700; color: #037539; }
.stat-label { font-size: 22rpx; color: #555555; margin-top: 8rpx; }
.section { margin-bottom: 8rpx; }
.section-title { font-size: 28rpx; font-weight: 700; color: #1A1A1A; padding: 24rpx 0 16rpx; }
.trend-card, .dist-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.trend-title, .dist-title { font-size: 26rpx; font-weight: 600; color: #333; margin-bottom: 16rpx; }
.trend-row { display: flex; overflow-x: auto; }
.trend-item { display: flex; flex-direction: column; align-items: center; min-width: 96rpx; }
.trend-count { font-size: 28rpx; font-weight: 700; color: #1A1A1A; }
.trend-date { font-size: 20rpx; color: #999; margin-top: 4rpx; }
.dist-row { display: flex; justify-content: space-between; padding: 10rpx 0; font-size: 26rpx; color: #333; border-bottom: 1px solid #F7F8F9; }
.dist-count { font-weight: 600; }
</style>