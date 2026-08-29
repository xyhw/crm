<template>
  <view class="finance-page">
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else>
      <view class="stat-grid">
        <view class="stat-card"><text class="stat-value">{{ data.today?.orders || 0 }}</text><text class="stat-label">今日订单</text></view>
        <view class="stat-card"><text class="stat-value">{{ data.today?.amount || 0 }}</text><text class="stat-label">今日营收(积分)</text></view>
        <view class="stat-card"><text class="stat-value">{{ data.total?.orders || 0 }}</text><text class="stat-label">累计订单</text></view>
        <view class="stat-card"><text class="stat-value">{{ data.total?.amount || 0 }}</text><text class="stat-label">累计营收</text></view>
        <view class="stat-card"><text class="stat-value">{{ data.total?.platform || 0 }}</text><text class="stat-label">平台抽成累计</text></view>
        <view class="stat-card"><text class="stat-value">{{ data.total?.seller || 0 }}</text><text class="stat-label">卖家收入累计</text></view>
        <view class="stat-card"><text class="stat-value">{{ data.users?.active || 0 }}</text><text class="stat-label">活跃用户</text></view>
        <view class="stat-card"><text class="stat-value">{{ data.opportunities?.active || 0 }}</text><text class="stat-label">在架商机</text></view>
      </view>

      <view class="section">
        <view class="section-title">积分概况</view>
        <view class="inner-grid">
          <view class="mini-card"><text class="mini-value">{{ data.points?.balance || 0 }}</text><text class="mini-label">积分存量</text></view>
          <view class="mini-card"><text class="mini-value">{{ data.points?.recharged || 0 }}</text><text class="mini-label">累计充值</text></view>
          <view class="mini-card"><text class="mini-value">{{ data.points?.consumed || 0 }}</text><text class="mini-label">累计消费</text></view>
          <view class="mini-card"><text class="mini-value">{{ data.points?.expired || 0 }}</text><text class="mini-label">累计过期</text></view>
        </view>
      </view>

      <view class="section">
        <view class="section-title">近7天交易趋势</view>
        <view class="trend-card">
          <view class="trend-row">
            <view v-for="(d, i) in (data.trend || [])" :key="i" class="trend-item">
              <text class="trend-date">{{ d.date }}</text>
              <text class="trend-count">{{ d.count }}</text>
              <text class="trend-amount">{{ d.amount }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/admin/adminApi';

const data = reactive({});
const loading = ref(true);

onShow(async () => {
  loading.value = true;
  try {
    const res = await adminApi.getFinance();
    Object.assign(data, res || {});
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  } finally {
    loading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.finance-page { min-height: 100vh; background: #F2F4F5; padding: 16rpx 24rpx; }
.stat-grid { display: flex; flex-wrap: wrap; justify-content: space-between; }
.stat-card { width: 47%; background: #fff; border-radius: 16rpx; padding: 24rpx 0; margin-bottom: 16rpx; display: flex; flex-direction: column; align-items: center; }
.stat-value { font-size: 34rpx; font-weight: 700; color: #048C47; }
.stat-label { font-size: 22rpx; color: #7A7A7A; margin-top: 8rpx; }
.section { margin-bottom: 8rpx; }
.section-title { font-size: 28rpx; font-weight: 700; color: #1A1A1A; padding: 24rpx 0 16rpx; }
.inner-grid { display: flex; flex-wrap: wrap; justify-content: space-between; }
.mini-card { width: 47%; background: #fff; border-radius: 16rpx; padding: 24rpx 0; margin-bottom: 16rpx; display: flex; flex-direction: column; align-items: center; }
.mini-value { font-size: 30rpx; font-weight: 700; color: #1A1A1A; }
.mini-label { font-size: 22rpx; color: #7A7A7A; margin-top: 8rpx; }
.trend-card { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.trend-row { display: flex; overflow-x: auto; }
.trend-item { display: flex; flex-direction: column; align-items: center; min-width: 110rpx; margin-right: 12rpx; }
.trend-date { font-size: 20rpx; color: #999; }
.trend-count { font-size: 26rpx; font-weight: 600; color: #1A1A1A; margin-top: 4rpx; }
.trend-amount { font-size: 20rpx; color: #048C47; margin-top: 2rpx; }
</style>