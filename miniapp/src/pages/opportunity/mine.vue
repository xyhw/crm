<template>
  <view class="my-opp-page">
    <!-- 状态筛选 -->
    <view class="status-tabs">
      <view
        v-for="t in tabOptions"
        :key="t.value"
        class="status-tab"
        :class="{ active: tab === t.value }"
        @click="switchTab(t.value)"
      >{{ t.label }}</view>
    </view>

    <view v-if="loading && list.length === 0" class="empty">加载中...</view>
    <view v-else-if="list.length === 0" class="empty-box">
      <text class="empty-text">{{ emptyText }}</text>
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

      <!-- 加载状态 -->
      <view class="load-status">
        <text v-if="loading" class="load-text">加载中...</text>
        <text v-else-if="!hasMore" class="load-text">没有更多了</text>
        <text v-else class="load-text">上拉加载更多</text>
      </view>
    </view>

    <!-- 底部主导航栏 -->
    <CustomTabBar active-tab="我的" />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app';
import { api } from '@/api/index';
import { stageLabel, stageTone } from '@/common/constants';
import CustomTabBar from '@/components/CustomTabBar.vue';

const list = ref([]);
const loading = ref(false);
const page = ref(1);
const total = ref(0);
const pageSize = 10;
const tab = ref('');

const tabOptions = [
  { label: '全部', value: '' },
  { label: '销售中', value: 'active' },
  { label: '已下架', value: 'inactive' },
  { label: '已失效', value: 'invalid' },
];

const STATUS_META = {
  active: { label: '销售中', tone: 'verified' },
  inactive: { label: '已下架', tone: 'default' },
  invalid: { label: '已失效', tone: 'hot' },
};

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));
const hasMore = computed(() => page.value < pageCount.value);
const emptyText = computed(() => {
  if (tab.value === 'active') return '没有销售中的商机';
  if (tab.value === 'inactive') return '没有已下架的商机';
  if (tab.value === 'invalid') return '没有已失效的商机';
  return '还没有发布过商机';
});

function statusLabel(status) {
  return (STATUS_META[status] || STATUS_META.active).label;
}
function statusTone(status) {
  return (STATUS_META[status] || STATUS_META.active).tone;
}
function editable(item) {
  return item.status !== 'invalid' && (item.purchaseCount || 0) === 0;
}

async function fetchList(p, append = false) {
  try {
    const res = await api.myOpportunities({
      page: p,
      pageSize,
      status: tab.value || undefined,
    });
    const items = res.list || [];
    list.value = append ? [...list.value, ...items] : items;
    total.value = res.total || 0;
    page.value = p;
  } catch (e) {
    uni.showToast({ title: e.message || '获取失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function load() {
  loading.value = true;
  await fetchList(1);
}

function switchTab(value) {
  if (tab.value === value) return;
  tab.value = value;
  load();
}

onShow(load);
onPullDownRefresh(async () => {
  await load();
  uni.stopPullDownRefresh();
});

onReachBottom(() => {
  if (loading.value || !hasMore.value) return;
  loading.value = true;
  fetchList(page.value + 1, true);
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
  padding: 16rpx 24rpx calc(110px + env(safe-area-inset-bottom));
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

/* 状态筛选 Tab */
.status-tabs {
  display: flex;
  background: #ffffff;
  border-radius: 12rpx;
  padding: 8rpx;
  margin-bottom: 16rpx;
}
.status-tab {
  flex: 1;
  text-align: center;
  font-size: 26rpx;
  color: #7A7A7A;
  padding: 12rpx 0;
  border-radius: 8rpx;
}
.status-tab.active {
  color: #ffffff;
  background: #048C47;
  font-weight: 600;
}

/* 加载状态 */
.load-status {
  text-align: center;
  padding: 24rpx 0 8rpx;
}
.load-text {
  font-size: 24rpx;
  color: #B0B0B0;
}
</style>