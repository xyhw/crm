<template>
  <view class="reminder-page">
    <!-- Tab 切换 -->
    <view class="rmd-tabs">
      <view
        v-for="t in tabs"
        :key="t.name"
        class="rmd-tab"
        :class="{ active: tab === t.name }"
        @click="switchTab(t.name)"
      >
        {{ t.title }}
      </view>
    </view>

    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="!reminders.length" class="empty">暂无提醒</view>
    <view v-else class="rmd-list">
      <view
        v-for="item in visible"
        :key="item.id"
        class="rmd-item"
        @click="goCrm(item.crmOpportunityId)"
      >
        <view class="rmd-title">{{ item.opportunityTitle || item.title || '未命名商机' }}</view>
        <view class="rmd-info">
          <text class="rmd-city">{{ item.city || '未知城市' }}</text>
          <text class="rmd-status">{{ followUpStatusLabel(item.status) }}</text>
        </view>
        <view
          class="rmd-remind"
          :class="tab === 'overdue' ? 'rmd-remind--danger' : 'rmd-remind--warning'"
        >
          {{ remindText(item) }}
        </view>
      </view>
      <view v-if="totalPages > 1" class="pager">
        <view class="pager-btn" :class="{ disabled: page <= 1 }" @click="changePage(page - 1)">上一页</view>
        <view class="pager-info">{{ page }} / {{ totalPages }}</view>
        <view class="pager-btn" :class="{ disabled: page >= totalPages }" @click="changePage(page + 1)">下一页</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { api } from '@/api/index';
import { followUpStatusLabel, formatDate } from '@/common/constants';

const tabs = [
  { title: '今日待跟进', name: 'today' },
  { title: '逾期未跟进', name: 'overdue' },
  { title: '即将到期', name: 'upcoming' },
];

const tab = ref('today');
const reminders = ref([]);
const loading = ref(true);
const page = ref(1);
const pageSize = 6;

onShow(() => {
  fetchList();
});

function switchTab(name) {
  if (tab.value === name) return;
  tab.value = name;
  page.value = 1;
  fetchList();
}

async function fetchList() {
  loading.value = true;
  page.value = 1;
  try {
    const res = await api.reminders({ type: tab.value });
    reminders.value = res?.list || [];
  } catch (e) {
    reminders.value = [];
    uni.showToast({ title: e.message || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function remindText(item) {
  if (tab.value === 'today') return '今日需跟进';
  if (tab.value === 'overdue') return '已逾期';
  return `到期日 ${formatDate(item.nextFollowDate)}`;
}

function goCrm(id) {
  if (!id) return;
  uni.navigateTo({ url: `/pages/crm/detail?id=${id}` });
}

const totalPages = computed(() => Math.ceil(reminders.value.length / pageSize));
const visible = computed(() => {
  const start = (page.value - 1) * pageSize;
  return reminders.value.slice(start, start + pageSize);
});

function changePage(p) {
  if (p < 1 || p > totalPages.value) return;
  page.value = p;
}
</script>

<style lang="scss" scoped>
.reminder-page {
  min-height: 100vh;
}

.rmd-tabs {
  display: flex;
  background: #ffffff;
  padding: 0 24rpx;
}

.rmd-tab {
  position: relative;
  padding: 24rpx 32rpx;
  font-size: 28rpx;
  color: #7A7A7A;
}

.rmd-tab.active {
  color: #048C47;
  font-weight: 600;
}

.rmd-tab.active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 40rpx;
  height: 6rpx;
  border-radius: 3rpx;
  background: #048C47;
}

.empty {
  text-align: center;
  padding: 120rpx 0;
  color: #B0B0B0;
  font-size: 28rpx;
}

.rmd-list {
  padding: 0 24rpx;
}

.rmd-item {
  background: #ffffff;
  border-radius: 16rpx;
  margin-top: 16rpx;
  padding: 24rpx;
}

.rmd-title {
  font-size: 28rpx;
  color: #1A1A1A;
  font-weight: 600;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.rmd-info {
  display: flex;
  align-items: center;
  margin-top: 12rpx;
}

.rmd-city {
  font-size: 24rpx;
  color: #7A7A7A;
  margin-right: 16rpx;
}

.rmd-status {
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  background: #F2F4F5;
  font-size: 22rpx;
  color: #4A4A4A;
}

.rmd-remind {
  margin-top: 12rpx;
  font-size: 24rpx;
}

.rmd-remind--danger {
  color: #E54848;
}

.rmd-remind--warning {
  color: #E8920A;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx 0 8rpx;
}

.pager-btn {
  padding: 10rpx 32rpx;
  border-radius: 8rpx;
  border: 1px solid #048C47;
  color: #048C47;
  font-size: 24rpx;
}

.pager-btn.disabled {
  opacity: 0.4;
}

.pager-info {
  margin: 0 24rpx;
  font-size: 24rpx;
  color: #7A7A7A;
}
</style>