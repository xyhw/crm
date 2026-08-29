<template>
  <view class="admin-list-page">
    <view class="filter-bar">
      <view class="filter-tabs">
        <view
          v-for="s in statusOptions"
          :key="s.value"
          class="filter-tab"
          :class="{ active: status === s.value }"
          @click="selectStatus(s.value)"
        >{{ s.label }}</view>
      </view>
    </view>

    <view v-if="loading && list.length === 0" class="empty">加载中...</view>
    <view v-else-if="list.length === 0" class="empty">暂无数据</view>
    <view v-else>
      <view v-for="item in list" :key="item.id" class="card-item">
        <view class="card-item__head">
          <text class="card-item__title">{{ item.user_name || '-' }}</text>
          <text class="status-tag" :class="'tone-' + followUpTone(item.status)">{{ followUpStatusLabel(item.status) }}</text>
        </view>
        <view class="card-item__info"><text>{{ item.opportunity_title || '-' }}</text></view>
        <view class="card-item__info">
          <text>{{ formatDateTime(item.created_at) }}</text>
          <text v-if="item.content">{{ item.content }}</text>
        </view>
        <view v-if="item.status === 'pending'" class="card-item__actions">
          <view class="act-btn" @click.stop="audit(item, 'approved')">通过</view>
          <view class="act-btn danger" @click.stop="audit(item, 'rejected')">驳回</view>
        </view>
      </view>

      <view v-if="pageCount > 1" class="pager">
        <view class="pager-btn" :class="{ disabled: page <= 1 }" @click="goPage(page - 1)">上一页</view>
        <text class="pager-info">{{ page }} / {{ pageCount }}</text>
        <view class="pager-btn" :class="{ disabled: page >= pageCount }" @click="goPage(page + 1)">下一页</view>
      </view>
      <view class="pager-total">共 {{ total }} 条</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/admin/adminApi';
import { formatDateTime, followUpStatusLabel } from '@/common/constants';

const list = ref([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = 10;
const status = ref('');

const statusOptions = [
  { label: '全部', value: '' },
  { label: '待审核', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
];

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

function followUpTone(s) {
  if (s === 'approved') return 'verified';
  if (s === 'rejected') return 'hot';
  if (s === 'pending') return 'warn';
  return 'default';
}

async function fetchList(p = 1) {
  loading.value = true;
  try {
    const res = await adminApi.getAuditList({
      page: p,
      pageSize,
      status: status.value || undefined,
    });
    list.value = res.list || [];
    total.value = res.total || 0;
    page.value = p;
  } catch (e) {
    uni.showToast({ title: e.message || '获取失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

onShow(() => fetchList(1));

function selectStatus(s) { status.value = s; fetchList(1); }
function goPage(p) {
  if (p < 1 || p > pageCount.value || p === page.value) return;
  fetchList(p);
}

function audit(item, action) {
  const label = action === 'approved' ? '通过' : '驳回';
  uni.showModal({
    title: '提示',
    content: `确认${label}该跟进分享？`,
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await adminApi.auditFollowUp(item.id, { status: action });
        uni.showToast({ title: `${label}成功`, icon: 'success' });
        fetchList(page.value);
      } catch (e) {
        uni.showToast({ title: e.message, icon: 'none' });
      }
    },
  });
}
</script>

<style lang="scss" scoped>
.admin-list-page { min-height: 100vh; background: #F2F4F5; padding: 16rpx 24rpx; }
.filter-bar { margin-bottom: 16rpx; }
.filter-tabs { display: flex; flex-wrap: wrap; }
.filter-tab { padding: 8rpx 24rpx; margin-right: 16rpx; margin-bottom: 12rpx; border-radius: 28rpx; font-size: 24rpx; color: #7A7A7A; background: #fff; }
.filter-tab.active { color: #fff; background: #048C47; }
.card-item { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.card-item__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.card-item__title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; flex: 1; margin-right: 16rpx; }
.status-tag { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; color: #7A7A7A; background: #F2F4F5; }
.tone-verified { color: #048C47; background: #E4F7EC; }
.tone-hot { color: #E54848; background: #FDECEC; }
.tone-warn { color: #B8841B; background: #FDF4DE; }
.card-item__info { display: flex; justify-content: space-between; font-size: 24rpx; color: #7A7A7A; margin-bottom: 8rpx; }
.card-item__info text { max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-item__actions { display: flex; justify-content: flex-end; margin-top: 12rpx; gap: 16rpx; }
.act-btn { padding: 8rpx 32rpx; border-radius: 32rpx; border: 1px solid #048C47; color: #048C47; font-size: 24rpx; }
.act-btn.danger { border-color: #E54848; color: #E54848; }
.pager { display: flex; align-items: center; justify-content: center; padding: 16rpx 0; }
.pager-btn { padding: 8rpx 28rpx; border: 1px solid #DDD; border-radius: 8rpx; font-size: 26rpx; color: #333; background: #fff; }
.pager-btn.disabled { color: #C0C0C0; border-color: #EEE; background: #F7F8F9; }
.pager-info { margin: 0 24rpx; font-size: 26rpx; color: #333; }
.pager-total { text-align: center; font-size: 24rpx; color: #B0B0B0; padding-bottom: 16rpx; }
</style>