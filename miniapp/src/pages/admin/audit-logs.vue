<template>
  <view class="admin-list-page">
    <view class="filter-bar">
      <SearchBar v-model="keywordInput" placeholder="搜索操作人/详情" @search="onSearch" @clear="onClear" />
      <scroll-view scroll-x class="filter-scroll">
        <view class="filter-tabs">
          <view
            v-for="s in actionOptions"
            :key="s.value"
            class="filter-tab"
            :class="{ active: action === s.value }"
            @click="selectAction(s.value)"
          >{{ s.label }}</view>
        </view>
      </scroll-view>
      <scroll-view scroll-x class="filter-scroll">
        <view class="filter-tabs">
          <view
            v-for="t in targetOptions"
            :key="t.value"
            class="filter-tab"
            :class="{ active: targetType === t.value }"
            @click="selectTarget(t.value)"
          >{{ t.label }}</view>
        </view>
      </scroll-view>
    </view>

    <StateView
      :loading="loading"
      :empty="!loading && list.length === 0"
      empty-title="暂无日志"
      empty-desc="暂无操作日志记录"
      :skeleton-count="4"
    >
      <view v-for="item in list" :key="item.id" class="card-item">
        <view class="card-item__head">
          <text class="card-item__title">{{ actionLabel(item.action) }}</text>
          <text class="status-tag">{{ item.admin_name || '-' }}</text>
        </view>
        <view class="card-item__info">
          <text>{{ item.target_type || '-' }} #{{ item.target_id || '-' }}</text>
          <text>{{ formatDateTime(item.created_at) }}</text>
        </view>
        <view v-if="item.detail" class="card-item__detail">{{ item.detail }}</view>
        <view v-if="item.ip" class="card-item__info"><text>IP {{ item.ip }}</text></view>
      </view>
    </StateView>

    <Pagination :page="page" :page-count="pageCount" :total="total" @change="goPage" />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/admin/adminApi';
import { formatDateTime } from '@/common/constants';
import SearchBar from '@/components/SearchBar.vue';
import Pagination from '@/components/Pagination.vue';
import StateView from '@/components/StateView.vue';

const list = ref([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = 15;
const keywordInput = ref('');
const action = ref('');
const targetType = ref('');

const ACTION_LABELS = {
  view: '查看', edit: '编辑', delete: '删除', create: '创建',
  approved: '审核通过', rejected: '审核驳回', ban: '封禁', unban: '解封',
  import: '批量导入', adjust_points: '调整积分', adjust_credits: '调整信用分',
  recharge_sync: '充值查单补账', recharge_refund: '充值退款登记',
};

const actionOptions = [
  { label: '全部', value: '' },
  { label: '编辑', value: 'edit' },
  { label: '删除', value: 'delete' },
  { label: '创建', value: 'create' },
  { label: '封禁', value: 'ban' },
  { label: '解封', value: 'unban' },
  { label: '审核通过', value: 'approved' },
  { label: '审核驳回', value: 'rejected' },
  { label: '调整积分', value: 'adjust_points' },
  { label: '调整信用分', value: 'adjust_credits' },
  { label: '充值退款登记', value: 'recharge_refund' },
];

const targetOptions = [
  { label: '全部目标', value: '' },
  { label: '商机', value: 'opportunities' },
  { label: '用户', value: 'users' },
  { label: '订单', value: 'orders' },
  { label: '进展同步', value: 'follow_up_shares' },
  { label: '等级', value: 'member_levels' },
  { label: '配置', value: 'system_configs' },
  { label: '角色', value: 'role' },
  { label: '管理员', value: 'admin_user' },
  { label: '充值订单', value: 'payment_order' },
];

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

function actionLabel(v) {
  return ACTION_LABELS[v] || v;
}

async function fetchList(p = 1) {
  loading.value = true;
  try {
    const res = await adminApi.getAuditLogs({
      page: p,
      pageSize,
      keyword: keywordInput.value || undefined,
      action: action.value || undefined,
      targetType: targetType.value || undefined,
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

function applyFilter() { fetchList(1); }
function onSearch() { fetchList(1); }
function onClear() { fetchList(1); }
function selectAction(v) { action.value = v; fetchList(1); }
function selectTarget(v) { targetType.value = v; fetchList(1); }
function goPage(p) {
  if (p < 1 || p > pageCount.value || p === page.value) return;
  fetchList(p);
}
</script>

<style lang="scss" scoped>
.admin-list-page { touch-action: manipulation;
  min-height: 100dvh; background: #F2F4F5; padding: 16rpx 24rpx 140rpx; }
.filter-bar { margin-bottom: 16rpx; }
.filter-scroll { white-space: nowrap; }
.filter-tabs { display: inline-flex; padding: 4rpx 0; }
.filter-tab { min-height: 72rpx; line-height: 72rpx; padding: 0 24rpx; margin-right: 16rpx; border-radius: 28rpx; font-size: 24rpx; color: #555555; background: #fff; display: inline-block; }
.filter-tab.active { color: #fff; background: #037539; }
.card-item { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.card-item__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.card-item__title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; }
.status-tag { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; color: #037539; background: #E4F7EC; }
.card-item__info { display: flex; justify-content: space-between; font-size: 24rpx; color: #555555; margin-bottom: 8rpx; }
.card-item__detail { font-size: 24rpx; color: #555; background: #F7F8F9; border-radius: 8rpx; padding: 12rpx; margin-bottom: 8rpx; }
</style>
