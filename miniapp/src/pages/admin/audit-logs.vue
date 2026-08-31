<template>
  <view class="admin-list-page">
    <view class="filter-bar">
      <input
        v-model="keywordInput"
        class="filter-input"
        placeholder="搜索操作人/详情"
        confirm-type="search"
        @confirm="applyFilter"
      />
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

    <view v-if="loading && list.length === 0" class="empty">加载中...</view>
    <view v-else-if="list.length === 0" class="empty">暂无数据</view>
    <view v-else>
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
import { formatDateTime } from '@/common/constants';

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
];

const targetOptions = [
  { label: '全部目标', value: '' },
  { label: '商机', value: 'opportunities' },
  { label: '用户', value: 'users' },
  { label: '订单', value: 'orders' },
  { label: '进度分享', value: 'follow_up_shares' },
  { label: '等级', value: 'member_levels' },
  { label: '配置', value: 'system_configs' },
  { label: '角色', value: 'role' },
  { label: '管理员', value: 'admin_user' },
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
function selectAction(v) { action.value = v; fetchList(1); }
function selectTarget(v) { targetType.value = v; fetchList(1); }
function goPage(p) {
  if (p < 1 || p > pageCount.value || p === page.value) return;
  fetchList(p);
}
</script>

<style lang="scss" scoped>
.admin-list-page { min-height: 100vh; background: #F2F4F5; padding: 16rpx 24rpx; }
.filter-bar { margin-bottom: 16rpx; }
.filter-input { height: 72rpx; background: #fff; border-radius: 36rpx; padding: 0 24rpx; font-size: 26rpx; margin-bottom: 16rpx; }
.filter-scroll { white-space: nowrap; }
.filter-tabs { display: inline-flex; padding: 4rpx 0; }
.filter-tab { padding: 8rpx 24rpx; margin-right: 16rpx; border-radius: 28rpx; font-size: 24rpx; color: #7A7A7A; background: #fff; display: inline-block; }
.filter-tab.active { color: #fff; background: #048C47; }
.card-item { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.card-item__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.card-item__title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; }
.status-tag { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; color: #048C47; background: #E4F7EC; }
.card-item__info { display: flex; justify-content: space-between; font-size: 24rpx; color: #7A7A7A; margin-bottom: 8rpx; }
.card-item__detail { font-size: 24rpx; color: #555; background: #F7F8F9; border-radius: 8rpx; padding: 12rpx; margin-bottom: 8rpx; }
.pager { display: flex; align-items: center; justify-content: center; padding: 16rpx 0; }
.pager-btn { padding: 8rpx 28rpx; border: 1px solid #DDD; border-radius: 8rpx; font-size: 26rpx; color: #333; background: #fff; }
.pager-btn.disabled { color: #C0C0C0; border-color: #EEE; background: #F7F8F9; }
.pager-info { margin: 0 24rpx; font-size: 26rpx; color: #333; }
.pager-total { text-align: center; font-size: 24rpx; color: #B0B0B0; padding-bottom: 16rpx; }
</style>