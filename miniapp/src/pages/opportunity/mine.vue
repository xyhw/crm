<template>
  <view class="my-opp-page">
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="list.length === 0" class="empty-box">
      <text class="empty-text">还没有发布过商机</text>
      <view class="publish-btn" @click="goPublish">立即发布</view>
    </view>
    <view v-else>
      <view v-for="item in list" :key="item.id" class="my-opp-card" @click="goDetail(item.id)">
        <view class="card-head">
          <text class="status-tag" :class="statusTone(item.status)">{{ statusLabel(item.status) }}</text>
          <text class="card-time">{{ item.createdAt ? item.createdAt.slice(0, 10) : '' }}</text>
        </view>
        <view class="card-title">{{ item.title }}</view>
        <view class="card-meta">
          <text>{{ item.hotelName || item.brand || '未知品牌' }} · {{ item.city || '未知城市' }}</text>
          <text v-if="item.stage" class="stage-tag" :class="stageTone(item.stage)">{{ stageLabel(item.stage) }}</text>
        </view>
        <view class="card-stats">
          <text>{{ item.price }} 积分</text>
          <text>{{ item.purchaseCount || 0 }}人已购</text>
          <text>{{ item.viewCount || 0 }}次浏览</text>
        </view>
        <view class="card-actions">
          <view v-if="editable(item)" class="edit-btn" @click.stop="goEdit(item.id)">编辑</view>
          <text v-else class="locked-text">{{ item.status === 'invalid' ? '已被判无效' : '已有购买者' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad, onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import { api } from '@/api/index';
import { stageLabel, stageTone } from '@/common/constants';

const list = ref([]);
const loading = ref(false);

const STATUS_META = {
  active: { label: '销售中', tone: 'verified' },
  inactive: { label: '已下架', tone: 'default' },
  invalid: { label: '已失效', tone: 'hot' },
};

function statusLabel(status) {
  return (STATUS_META[status] || STATUS_META.active).label;
}
function statusTone(status) {
  return (STATUS_META[status] || STATUS_META.active).tone;
}
function editable(item) {
  return item.status !== 'invalid' && (item.purchaseCount || 0) === 0;
}

async function load() {
  loading.value = true;
  try {
    const res = await api.myOpportunities({ pageSize: 50 });
    list.value = res.list || [];
  } catch (e) {
    uni.showToast({ title: e.message || '获取失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

onShow(load);
onPullDownRefresh(async () => {
  await load();
  uni.stopPullDownRefresh();
});

function goPublish() {
  uni.navigateTo({ url: '/pages/opportunity/publish' });
}
function goDetail(id) {
  uni.navigateTo({ url: `/pages/opportunity/detail?id=${id}` });
}
function goEdit(id) {
  uni.navigateTo({ url: `/pages/opportunity/publish?edit=${id}` });
}
</script>

<style lang="scss" scoped>
.my-opp-page {
  min-height: 100vh;
  padding: 16rpx 24rpx;
}

.empty {
  padding: 120rpx 0;
  text-align: center;
  color: #B0B0B0;
  font-size: 28rpx;
}

.empty-box {
  padding: 160rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-text {
  font-size: 28rpx;
  color: #B0B0B0;
  margin-bottom: 32rpx;
}

.publish-btn {
  padding: 20rpx 64rpx;
  border-radius: 44rpx;
  background: #048C47;
  color: #ffffff;
  font-size: 30rpx;
}

.my-opp-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 16rpx;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.status-tag {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  color: #7A7A7A;
  background: #F2F4F5;
}
.status-tag.verified {
  color: #048C47;
  background: #E4F7EC;
}
.status-tag.hot {
  color: #E54848;
  background: #FDECEC;
}

.card-time {
  font-size: 22rpx;
  color: #B0B0B0;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 12rpx;
}

.card-meta {
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: #7A7A7A;
  margin-bottom: 12rpx;
}

.stage-tag {
  margin-left: 12rpx;
  font-size: 20rpx;
  border-radius: 8rpx;
  padding: 2rpx 10rpx;
  color: #7A7A7A;
  background: #F2F4F5;
}
.stage-tag.hot {
  color: #E54848;
  background: #FDECEC;
}
.stage-tag.warm {
  color: #E8920A;
  background: #FFF4E0;
}
.stage-tag.verified {
  color: #048C47;
  background: #E4F7EC;
}

.card-stats {
  display: flex;
  font-size: 22rpx;
  color: #555555;
  margin-bottom: 16rpx;
}
.card-stats text {
  margin-right: 24rpx;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
}

.edit-btn {
  padding: 8rpx 32rpx;
  border-radius: 32rpx;
  border: 1px solid #048C47;
  color: #048C47;
  font-size: 24rpx;
}

.locked-text {
  font-size: 24rpx;
  color: #B0B0B0;
}
</style>