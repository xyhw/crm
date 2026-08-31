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

    <StateView
      :loading="loading"
      :empty="!loading && list.length === 0"
      empty-title="暂无审核记录"
      empty-desc="暂无跟进分享审核记录"
      :skeleton-count="4"
    >
      <view v-for="item in list" :key="item.id" class="card-item">
        <view class="card-item__head">
          <text class="card-item__title">{{ item.user_name || '-' }}</text>
          <text class="status-tag" :class="'tone-' + followUpTone(item.status)">{{ followUpStatusLabel(item.status) }}</text>
        </view>
        <view class="card-item__info"><text>{{ item.opportunity_title || '-' }}</text></view>
        <view class="card-item__info">
          <text>{{ formatDateTime(item.created_at) }}</text>
          <text v-if="item.summary">{{ item.summary }}</text>
        </view>
        <view v-if="item.status === 'pending'" class="card-item__actions">
          <view class="act-btn" @click.stop="confirmAudit(item, 'approved')">通过</view>
          <view class="act-btn danger" @click.stop="confirmAudit(item, 'rejected')">驳回</view>
        </view>
      </view>
    </StateView>

    <Pagination :page="page" :page-count="pageCount" :total="total" @change="goPage" />

    <ConfirmDialog
      v-model:visible="confirmVisible"
      title="审核确认"
      :content="`确认${confirmAction === 'approved' ? '通过' : '驳回'}该跟进分享？`"
      desc="该操作不可撤销"
      :confirm-text="confirmAction === 'approved' ? '通过' : '驳回'"
      :tone="confirmAction === 'rejected' ? 'danger' : 'primary'"
      @confirm="doAudit"
    />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/admin/adminApi';
import { formatDateTime, followUpStatusLabel } from '@/common/constants';
import Pagination from '@/components/Pagination.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import StateView from '@/components/StateView.vue';

const list = ref([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = 10;
const status = ref('');
const confirmVisible = ref(false);
const confirmItem = ref(null);
const confirmAction = ref('');

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

function confirmAudit(item, action) {
  confirmItem.value = item;
  confirmAction.value = action;
  confirmVisible.value = true;
}
async function doAudit() {
  if (!confirmItem.value || !confirmAction.value) return;
  const action = confirmAction.value;
  const label = action === 'approved' ? '通过' : '驳回';
  try {
    await adminApi.auditFollowUp(confirmItem.value.id, { status: action });
    uni.showToast({ title: `${label}成功`, icon: 'success' });
    confirmItem.value = null;
    confirmAction.value = '';
    fetchList(page.value);
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  }
}
</script>

<style lang="scss" scoped>
.admin-list-page { min-height: 100vh; background: #F2F4F5; padding: 16rpx 24rpx 140rpx; }
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
</style>
