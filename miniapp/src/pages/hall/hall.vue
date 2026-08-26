<template>
  <view class="hall-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索商机"
        confirm-type="search"
        @confirm="onSearch"
      />
      <text class="search-btn" @click="onSearch">搜索</text>
    </view>

    <!-- 分类筛选（横向滚动） -->
    <scroll-view scroll-x class="category-scroll">
      <view class="category-tabs">
        <view
          v-for="tab in categoryTabs"
          :key="tab.value"
          class="category-tab"
          :class="{ active: category === tab.value }"
          @click="selectCategory(tab.value)"
        >
          {{ tab.label }}
        </view>
      </view>
    </scroll-view>

    <!-- 排序 -->
    <view class="sort-bar">
      <view
        v-for="s in sortOptions"
        :key="s.value"
        class="sort-item"
        :class="{ active: sort === s.value }"
        @click="selectSort(s.value)"
      >
        {{ s.label }}
      </view>
    </view>

    <!-- 列表 -->
    <view class="list-wrap">
      <view v-if="loading && list.length === 0" class="empty">加载中...</view>
      <view v-else-if="list.length === 0" class="empty">暂无商机，换个分类或关键词试试</view>
      <view
        v-for="item in list"
        :key="item.id"
        class="opportunity-card"
        :class="{ purchased: item.isPurchased }"
        @click="goDetail(item.id)"
      >
        <view class="card-header">
          <view class="cat-badge">{{ CATEGORIES[item.categoryId] }}</view>
          <view class="card-info">
            <view class="card-title">
              <text v-if="item.isPurchased" class="purchased-tag">已解锁</text>
              <text class="title-text">{{ item.title }}</text>
            </view>
            <view class="card-meta">
              <text class="meta-text">{{ item.hotelName || item.brand || '未知品牌' }} · {{ item.city || '未知城市' }}</text>
              <text v-if="item.stage" class="stage-tag">{{ stageLabel(item.stage) }}</text>
            </view>
          </view>
        </view>
        <view class="card-footer">
          <view class="card-price">
            <text>{{ item.price }} 积分</text>
          </view>
          <view class="card-stats">
            <text class="buy-count">{{ item.purchaseCount || 0 }}人已购</text>
            <text class="card-time">{{ timeAgo(item.createdAt) }}</text>
          </view>
        </view>
      </view>
      <view v-if="!loading && hasMore" class="load-more" @click="loadMore">加载更多</view>
      <view v-if="!loading && !hasMore && list.length > 0" class="load-more">已经到底了</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app';
import { api } from '@/api/index';
import { SUPPLIER_CATEGORIES, stageLabel, timeAgo } from '@/common/constants';

const CATEGORIES = {};

SUPPLIER_CATEGORIES.forEach((c) => {
  CATEGORIES[c.value] = c.label;
});

const list = ref([]);
const loading = ref(false);
const refreshing = ref(false);
const keyword = ref('');
const category = ref('');
const sort = ref('newest');
const page = ref(1);
const hasMore = ref(true);

const categoryTabs = computed(() => [
  { label: '全部', value: '' },
  ...SUPPLIER_CATEGORIES.map((c) => ({ label: c.label, value: String(c.value) })),
]);

const sortOptions = [
  { label: '最新', value: 'newest' },
  { label: '最热', value: 'popular' },
  { label: '价格↑', value: 'price_asc' },
  { label: '价格↓', value: 'price_desc' },
];

async function fetchList(p = 1, reset = false) {
  try {
    const res = await api.opportunities({
      status: 'active',
      category: category.value || undefined,
      keyword: keyword.value || undefined,
      sort: sort.value,
      page: p,
      pageSize: 10,
    });
    const newList = res.list || [];
    list.value = reset ? newList : [...list.value, ...newList];
    hasMore.value = newList.length === 10;
    page.value = p;
  } catch (e) {
    uni.showToast({ title: e.message || '获取失败', icon: 'none' });
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

async function reload() {
  loading.value = true;
  await fetchList(1, true);
}

function selectCategory(value) {
  if (category.value === value) return;
  category.value = value;
  reload();
}

function selectSort(value) {
  if (sort.value === value) return;
  sort.value = value;
  reload();
}

function onSearch() {
  reload();
}

async function loadMore() {
  if (!loading.value && hasMore.value) {
    await fetchList(page.value + 1);
  }
}

function goDetail(id) {
  uni.navigateTo({ url: `/pages/opportunity/detail?id=${id}` });
}

onLoad(() => {
  reload();
});

onPullDownRefresh(async () => {
  refreshing.value = true;
  await reload();
  uni.stopPullDownRefresh();
});

onReachBottom(() => {
  loadMore();
});
</script>

<style lang="scss" scoped>
.hall-page {
  min-height: 100vh;
}

.search-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  background: #ffffff;
}

.search-input {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  padding: 0 24rpx;
  background: #F2F4F5;
  border-radius: 36rpx;
  font-size: 28rpx;
}

.search-btn {
  margin-left: 16rpx;
  color: #048C47;
  font-size: 28rpx;
}

.category-scroll {
  width: 100%;
  white-space: nowrap;
  background: #ffffff;
}

.category-tabs {
  display: inline-flex;
  padding: 12rpx 24rpx;
}

.category-tab {
  display: inline-block;
  padding: 12rpx 24rpx;
  margin-right: 16rpx;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #7A7A7A;
  background: #F2F4F5;
}

.category-tab.active {
  color: #ffffff;
  background: #048C47;
}

.sort-bar {
  display: flex;
  padding: 16rpx 24rpx;
  background: #ffffff;
  border-bottom: 1px solid #F2F4F5;
}

.sort-item {
  margin-right: 40rpx;
  font-size: 26rpx;
  color: #7A7A7A;
}

.sort-item.active {
  color: #048C47;
  font-weight: 600;
}

.list-wrap {
  padding: 16rpx 24rpx;
}

.opportunity-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.opportunity-card.purchased {
  border: 1px solid #048C47;
}

.card-header {
  display: flex;
}

.cat-badge {
  width: 96rpx;
  height: 96rpx;
  border-radius: 16rpx;
  background: #E4F7EC;
  color: #048C47;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.card-info {
  flex: 1;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.purchased-tag {
  display: inline-block;
  margin-right: 8rpx;
  padding: 2rpx 12rpx;
  font-size: 20rpx;
  color: #ffffff;
  background: #048C47;
  border-radius: 8rpx;
}

.title-text {
  display: inline;
}

.card-meta {
  margin-top: 8rpx;
  display: flex;
  align-items: center;
}

.meta-text {
  font-size: 24rpx;
  color: #7A7A7A;
}

.stage-tag {
  margin-left: 12rpx;
  font-size: 20rpx;
  color: #048C47;
  background: #E4F7EC;
  border-radius: 8rpx;
  padding: 2rpx 10rpx;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20rpx;
}

.card-price {
  font-size: 32rpx;
  color: #048C47;
  font-weight: 700;
}

.card-stats {
  display: flex;
  align-items: center;
}

.buy-count {
  font-size: 24rpx;
  color: #B0B0B0;
  margin-right: 16rpx;
}

.card-time {
  font-size: 22rpx;
  color: #B0B0B0;
}

.load-more {
  text-align: center;
  padding: 24rpx;
  color: #B0B0B0;
  font-size: 26rpx;
}

.empty {
  text-align: center;
  padding: 120rpx 0;
  color: #B0B0B0;
  font-size: 28rpx;
}
</style>