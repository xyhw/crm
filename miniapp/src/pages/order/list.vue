<template>
  <view class="orders-page">
    <!-- Tab 切换 -->
    <view class="tabs">
      <view
        v-for="t in TABS"
        :key="t.name"
        class="tab-item"
        :class="{ active: tab === t.name }"
        @click="switchTab(t.name)"
      >
        {{ t.title }}
      </view>
    </view>

    <view class="list-wrap">
      <view v-if="loading" class="empty">加载中...</view>
      <view v-else-if="list.length === 0" class="empty">
        {{ tab === 'published' ? '暂无发布记录，去大厅发布第一条商机吧' : '暂无购买记录，去大厅看看' }}
      </view>
      <template v-else>
        <view
          v-for="item in visible"
          :key="item.id"
          class="order-card"
          @click="goDetail(item.id)"
        >
          <view class="order-card__header">
            <view class="order-card__title">{{ item.title }}</view>
            <view class="order-card__status">
              <text v-if="item.isPublisher" class="order-tag">我发布</text>
              <text v-if="item.isPurchased" class="order-tag order-tag--buy">我已购</text>
              <text v-if="!item.isPublisher && !item.isPurchased" class="order-tag" :style="statusStyleOf(item.status)">
                {{ statusLabelOf(item.status) }}
              </text>
            </view>
          </view>
          <view class="order-card__info">
            <text>{{ item.city || '未知城市' }}</text>
            <text class="info-sep">·</text>
            <text>{{ item.hotelName || '未知酒店' }}</text>
          </view>
          <view class="order-card__footer">
            <view class="order-card__price">
              <text>{{ item.price }}</text>
              <text class="price-unit"> 积分</text>
            </view>
            <view class="order-card__stats">
              <text class="buy-count">{{ item.purchaseCount || 0 }} 人已购</text>
              <text class="order-time">{{ timeAgo(item.createdAt) }}</text>
            </view>
          </view>
        </view>
        <view v-if="totalPages > 1" class="mi-pagination">
          <view class="page-btn" :class="{ disabled: page <= 1 }" @click="prevPage">上一页</view>
          <view class="page-info">{{ page }} / {{ totalPages }}</view>
          <view class="page-btn" :class="{ disabled: page >= totalPages }" @click="nextPage">下一页</view>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { api } from '@/api/index';
import { OPPORTUNITY_STATUS_META, timeAgo } from '@/common/constants';

const TABS = [
  { title: '我发布的', name: 'published' },
  { title: '我购买的', name: 'purchased' },
];

const tab = ref('published');
const list = ref([]);
const loading = ref(true);
const page = ref(1);
const pageSize = 6;

const totalPages = computed(() => Math.max(1, Math.ceil(list.value.length / pageSize)));
const visible = computed(() => list.value.slice((page.value - 1) * pageSize, page.value * pageSize));

function statusLabelOf(value) {
  return OPPORTUNITY_STATUS_META[value]?.label || value;
}

function statusStyleOf(value) {
  const meta = OPPORTUNITY_STATUS_META[value] || OPPORTUNITY_STATUS_META.active;
  return { color: meta.color, background: meta.bg };
}

async function fetchList() {
  loading.value = true;
  page.value = 1;
  try {
    const res = tab.value === 'purchased'
      ? await api.myOrders({ pageSize: 50 })
      : await api.opportunities({ mine: 1, pageSize: 50 });
    list.value = res.list || [];
  } catch (e) {
    uni.showToast({ title: e.message || '获取失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function switchTab(name) {
  if (tab.value === name) return;
  tab.value = name;
  fetchList();
}

function prevPage() {
  if (page.value > 1) page.value -= 1;
}

function nextPage() {
  if (page.value < totalPages.value) page.value += 1;
}

function goDetail(id) {
  uni.navigateTo({ url: `/pages/opportunity/detail?id=${id}` });
}

onShow(() => {
  fetchList();
});
</script>

<style lang="scss" scoped>
.orders-page {
  min-height: 100vh;
}

.tabs {
  display: flex;
  background: #ffffff;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 28rpx 0;
  font-size: 28rpx;
  color: #7A7A7A;
  position: relative;
}

.tab-item.active {
  color: #048C47;
  font-weight: 600;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: 48rpx;
  height: 6rpx;
  background: #048C47;
  border-radius: 3rpx;
}

.list-wrap {
  padding: 16rpx 24rpx;
}

.order-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.order-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.order-card__title {
  flex: 1;
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1A1A;
  margin-right: 16rpx;
}

.order-card__status {
  display: flex;
}

.order-tag {
  padding: 2rpx 12rpx;
  font-size: 20rpx;
  color: #048C47;
  background: #E4F7EC;
  border-radius: 8rpx;
  margin-left: 8rpx;
}

.order-tag--buy {
  color: #048C47;
  border: 1px solid #048C47;
  background: transparent;
}

.order-card__info {
  display: flex;
  align-items: center;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #7A7A7A;
}

.info-sep {
  margin: 0 8rpx;
}

.order-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16rpx;
}

.order-card__price {
  font-size: 32rpx;
  color: #048C47;
  font-weight: 700;
}

.price-unit {
  font-size: 22rpx;
  font-weight: 400;
}

.order-card__stats {
  display: flex;
  align-items: center;
}

.buy-count {
  font-size: 22rpx;
  color: #B0B0B0;
  margin-right: 16rpx;
}

.order-time {
  font-size: 22rpx;
  color: #B0B0B0;
}

.mi-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16rpx 0 4rpx;
}

.page-btn {
  padding: 8rpx 24rpx;
  font-size: 24rpx;
  color: #048C47;
  background: #E4F7EC;
  border-radius: 24rpx;
}

.page-btn.disabled {
  color: #B0B0B0;
  background: #F2F4F5;
}

.page-info {
  margin: 0 24rpx;
  font-size: 24rpx;
  color: #7A7A7A;
}

.empty {
  text-align: center;
  padding: 120rpx 0;
  color: #B0B0B0;
  font-size: 28rpx;
}
</style>