<template>
  <view class="notify-page">
    <!-- Tab 切换 -->
    <view class="notify-tabs">
      <view
        v-for="t in tabs"
        :key="t.name"
        class="notify-tab"
        :class="{ active: type === t.name }"
        @click="switchType(t.name)"
      >
        <text>{{ t.title }}</text>
        <text v-if="tabUnread(t) > 0" class="notify-badge">{{ tabUnread(t) > 99 ? '99+' : tabUnread(t) }}</text>
      </view>
    </view>

    <view class="navbar-action" v-if="unreadCount > 0" @click="handleReadAll">全部已读</view>

    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="!list.length" class="empty">暂无通知</view>
    <view v-else class="notify-list">
      <view
        v-for="item in list"
        :key="item.id"
        class="notify-item"
        :class="{ 'notify-item--unread': !item.is_read }"
        @click="handleRead(item.id)"
      >
        <view class="notify-dot" v-if="!item.is_read"></view>
        <view class="notify-content">
          <view class="notify-title">{{ item.title }}</view>
          <view class="notify-desc">{{ item.content }}</view>
          <view class="notify-time">{{ timeAgo(item.created_at) }}</view>
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
import { timeAgo } from '@/common/constants';

const tabs = [
  { title: '全部', name: '' },
  { title: '系统', name: 'system' },
  { title: '交易', name: 'trade' },
  { title: '互动', name: 'interaction' },
];

const type = ref('');
const list = ref([]);
const loading = ref(true);
const unreadCount = ref(0);
const unreadByType = ref({});
const page = ref(1);
const total = ref(0);
const pageSize = 6;

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

function tabUnread(t) {
  if (!t.name) return unreadCount.value;
  return unreadByType.value[t.name] || 0;
}

onShow(() => {
  page.value = 1;
  fetchList();
});

function switchType(name) {
  if (type.value === name) return;
  type.value = name;
  page.value = 1;
  fetchList();
}

async function fetchList() {
  loading.value = true;
  try {
    const res = await api.notifications({ type: type.value || undefined, page: page.value, pageSize });
    list.value = res?.list || [];
    total.value = res?.total ?? list.value.length;
    unreadCount.value = res?.unreadCount || 0;
    unreadByType.value = res?.unreadByType || {};
  } catch (e) {
    list.value = [];
    uni.showToast({ title: e.message || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function handleRead(id) {
  try {
    const target = list.value.find((n) => n.id === id);
    await api.markNotificationRead(id);
    if (target && !target.is_read) {
      list.value = list.value.map((n) => (n.id === id ? { ...n, is_read: 1 } : n));
      unreadCount.value = Math.max(0, unreadCount.value - 1);
      if (target.type) {
        unreadByType.value = {
          ...unreadByType.value,
          [target.type]: Math.max(0, (unreadByType.value[target.type] || 0) - 1),
        };
      }
    }
  } catch (e) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' });
  }
}

async function handleReadAll() {
  try {
    await api.markAllRead();
    unreadCount.value = 0;
    unreadByType.value = {};
    list.value = list.value.map((n) => ({ ...n, is_read: 1 }));
    uni.showToast({ title: '已全部标记已读', icon: 'none' });
  } catch (e) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' });
  }
}

async function changePage(p) {
  if (p < 1 || p > totalPages.value) return;
  page.value = p;
  await fetchList();
}
</script>

<style lang="scss" scoped>
.notify-page {
  min-height: 100vh;
}

.notify-tabs {
  display: flex;
  background: #ffffff;
  padding: 0 24rpx;
}

.notify-tab {
  position: relative;
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  font-size: 28rpx;
  color: #7A7A7A;
}

.notify-tab.active {
  color: #048C47;
  font-weight: 600;
}

.notify-tab.active::after {
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

.notify-badge {
  margin-left: 8rpx;
  min-width: 32rpx;
  height: 32rpx;
  line-height: 32rpx;
  padding: 0 8rpx;
  border-radius: 16rpx;
  background: #E54848;
  color: #ffffff;
  font-size: 20rpx;
  text-align: center;
}

.navbar-action {
  text-align: right;
  padding: 16rpx 32rpx 8rpx;
  font-size: 26rpx;
}

.empty {
  text-align: center;
  padding: 120rpx 0;
  color: #B0B0B0;
  font-size: 28rpx;
}

.notify-list {
  padding: 0 24rpx;
}

.notify-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  background: #ffffff;
  border-radius: 16rpx;
  margin-top: 16rpx;
  padding: 24rpx;
}

.notify-item--unread {
  background: #F3FBF6;
}

.notify-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #048C47;
  margin-top: 12rpx;
  margin-right: 16rpx;
}

.notify-content {
  flex: 1;
}

.notify-title {
  font-size: 28rpx;
  color: #1A1A1A;
  font-weight: 600;
}

.notify-desc {
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #7A7A7A;
  line-height: 1.5;
}

.notify-time {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #B0B0B0;
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