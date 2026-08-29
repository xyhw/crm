<template>
  <view class="crm-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索商机"
        confirm-type="search"
        @input="onKeywordInput"
        @confirm="onSearch"
      />
    </view>

    <!-- 数据源切换 -->
    <scroll-view scroll-x class="status-scroll">
      <view class="status-tabs">
        <view
          v-for="tab in modeTabs"
          :key="tab.name"
          class="status-tab"
          :class="{ active: mode === tab.name }"
          @click="selectMode(tab.name)"
        >
          {{ tab.title }}
        </view>
      </view>
    </scroll-view>

    <!-- 状态筛选（仅手动线索模式） -->
    <scroll-view v-if="mode === 'crm'" scroll-x class="status-scroll">
      <view class="status-tabs">
        <view
          v-for="tab in statusTabs"
          :key="tab.name"
          class="status-tab"
          :class="{ active: status === tab.name }"
          @click="selectStatus(tab.name)"
        >
          {{ tab.title }}
        </view>
      </view>
    </scroll-view>

    <!-- 列表 -->
    <view class="list-wrap">
      <view v-if="loading && list.length === 0" class="empty">加载中...</view>
      <view v-else-if="list.length === 0" class="empty">{{ mode === 'mine' ? '还没有发布过商机' : '暂无CRM商机' }}</view>

      <!-- 我发布的商机卡片 -->
      <template v-else-if="mode === 'mine'">
        <view
          v-for="item in list"
          :key="item.id"
          class="crm-card"
          @click="goOppDetail(item.id)"
        >
          <view class="crm-card-header">
            <view class="cat-badge">{{ item.category_icon || '商机' }}</view>
            <view class="crm-card-title">{{ item.title }}</view>
          </view>
          <view class="crm-card-info">
            <text>{{ item.city || '未知城市' }}</text>
            <text class="sep">·</text>
            <text>{{ item.hotelName || item.brand || '未知酒店' }}</text>
          </view>
          <view class="crm-card-footer">
            <text class="status-tag" :style="oppStatusStyle(item.status)">{{ oppStatusLabel(item.status) }}</text>
            <text class="follow-count">{{ item.purchaseCount || 0 }} 人已购 · {{ item.viewCount || 0 }} 浏览</text>
          </view>
          <view class="crm-card-actions">
            <view v-if="editableOpp(item)" class="edit-btn" @click.stop="goEditOpp(item.id)">编辑</view>
            <text v-else class="locked-text">{{ item.status === 'invalid' ? '已被判无效' : '已有购买者' }}</text>
          </view>
        </view>
      </template>

      <!-- 手动线索卡片 -->
      <template v-else>
        <view
          v-for="item in list"
          :key="item.id"
          class="crm-card"
          @click="goCrmDetail(item.id)"
        >
          <view class="crm-card-header">
            <view class="cat-badge">{{ item.category_icon || 'CRM' }}</view>
            <view class="crm-card-title">{{ item.title || '手动录入商机' }}</view>
          </view>
          <view class="crm-card-info">
            <text>{{ item.city || '未知城市' }}</text>
            <text class="sep">·</text>
            <text>{{ item.hotel_name || '未知酒店' }}</text>
            <text class="sep">·</text>
            <text>{{ item.category_name || '其他' }}</text>
          </view>
          <view class="crm-card-footer">
            <text class="status-tag" :style="statusMetaOf(item.status)">{{ crmStatusLabel(item.status) }}</text>
            <text class="follow-count">{{ item.follow_up_count || 0 }} 次跟进</text>
          </view>
          <view v-if="item.next_follow_date" class="crm-card-remind">
            下次跟进：{{ formatDate(item.next_follow_date) }}
          </view>
        </view>
      </template>

      <view v-if="!loading && hasMore && list.length > 0" class="load-more" @click="loadMore">加载更多</view>
      <view v-if="!loading && !hasMore && list.length > 0" class="load-more">已经到底了</view>
    </view>

    <!-- 手动录入按钮（仅手动线索模式） -->
    <view v-if="mode === 'crm'" class="fab" @click="goAdd">
      <text class="fab-plus">+</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad, onUnload, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app';
import { api } from '@/api/index';
import { CRM_STATUS_META, crmStatusLabel, formatDate, opportunityStatusLabel } from '@/common/constants';

let debounceTimer = null;

const list = ref([]);
const loading = ref(false);
const keyword = ref('');
const status = ref('');
const page = ref(1);
const hasMore = ref(true);
const mode = ref('crm');

const modeTabs = [
  { title: '手动线索', name: 'crm' },
  { title: '我发布的', name: 'mine' },
];

const statusTabs = [
  { title: '全部', name: '' },
  { title: '待跟进', name: 'pending' },
  { title: '跟进中', name: 'following' },
  { title: '已成交', name: 'closed' },
  { title: '已放弃', name: 'abandoned' },
];

const OPP_STATUS_META = {
  active: { color: '#048C47', background: '#E4F7EC' },
  inactive: { color: '#7A7A7A', background: '#F2F4F5' },
  invalid: { color: '#E54848', background: '#FDECEC' },
};

function statusMetaOf(value) {
  const meta = CRM_STATUS_META[value] || CRM_STATUS_META.pending;
  return { color: meta.color, background: meta.bg };
}

function oppStatusLabel(value) {
  return opportunityStatusLabel(value);
}

function oppStatusStyle(value) {
  const meta = OPP_STATUS_META[value] || OPP_STATUS_META.active;
  return { color: meta.color, background: meta.background };
}

function editableOpp(item) {
  return item.status !== 'invalid' && (item.purchaseCount || 0) === 0;
}

async function fetchList(p = 1, reset = false) {
  try {
    const res = mode.value === 'mine'
      ? await api.myOpportunities({ keyword: keyword.value || undefined, page: p, pageSize: 10 })
      : await api.crmList({
          status: status.value || undefined,
          keyword: keyword.value || undefined,
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
  }
}

async function reload() {
  loading.value = true;
  await fetchList(1, true);
}

function loadMore() {
  if (!loading.value && hasMore.value) {
    loading.value = true;
    fetchList(page.value + 1, false);
  }
}

function selectMode(value) {
  if (mode.value === value) return;
  mode.value = value;
  status.value = '';
  reload();
}

function selectStatus(value) {
  if (status.value === value) return;
  status.value = value;
  reload();
}

function onSearch() {
  reload();
}

function onKeywordInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    reload();
  }, keyword.value ? 350 : 0);
}

function goCrmDetail(id) {
  uni.navigateTo({ url: `/pages/crm/detail?id=${id}` });
}

function goOppDetail(id) {
  uni.navigateTo({ url: `/pages/opportunity/detail?id=${id}` });
}

function goEditOpp(id) {
  uni.navigateTo({ url: `/pages/opportunity/publish?edit=${id}` });
}

function goAdd() {
  uni.navigateTo({ url: '/pages/crm/add' });
}

onLoad(() => {
  reload();
});

onUnload(() => {
  clearTimeout(debounceTimer);
});

onPullDownRefresh(async () => {
  await reload();
  uni.stopPullDownRefresh();
});

onReachBottom(() => {
  loadMore();
});
</script>

<style lang="scss" scoped>
.crm-page {
  min-height: 100vh;
}

.search-bar {
  background: #ffffff;
  padding: 16rpx 24rpx;
}

.search-input {
  height: 72rpx;
  line-height: 72rpx;
  padding: 0 24rpx;
  background: #F2F4F5;
  border-radius: 36rpx;
  font-size: 28rpx;
}

.status-scroll {
  width: 100%;
  white-space: nowrap;
  background: #ffffff;
}

.status-tabs {
  display: inline-flex;
  padding: 12rpx 24rpx;
}

.status-tab {
  display: inline-block;
  padding: 12rpx 28rpx;
  margin-right: 16rpx;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #7A7A7A;
  background: #F2F4F5;
}

.status-tab.active {
  color: #ffffff;
  background: #048C47;
}

.list-wrap {
  padding: 16rpx 24rpx;
}

.crm-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.crm-card-header {
  display: flex;
  align-items: center;
}

.cat-badge {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: #E4F7EC;
  color: #048C47;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.crm-card-title {
  flex: 1;
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.crm-card-info {
  display: flex;
  align-items: center;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #7A7A7A;
}

.sep {
  margin: 0 8rpx;
}

.crm-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}

.status-tag {
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}

.follow-count {
  font-size: 22rpx;
  color: #B0B0B0;
}

.crm-card-remind {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #E8920A;
}

.fab {
  position: fixed;
  right: 32rpx;
  bottom: calc(120rpx + env(safe-area-inset-bottom));
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: #048C47;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(4, 140, 71, 0.4);
  z-index: 100;
}

.fab-plus {
  font-size: 48rpx;
  line-height: 1;
}

.empty {
  text-align: center;
  padding: 120rpx 0;
  color: #B0B0B0;
  font-size: 28rpx;
}

.load-more {
  text-align: center;
  padding: 24rpx;
  color: #B0B0B0;
  font-size: 26rpx;
}

.crm-card-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12rpx;
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