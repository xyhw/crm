<template>
  <view class="admin-list-page">
    <view class="filter-bar">
      <input
        v-model="keywordInput"
        class="filter-input"
        placeholder="搜索用户手机号/昵称"
        confirm-type="search"
        @confirm="applyFilter"
      />
      <view class="filter-tabs">
        <view
          v-for="s in typeOptions"
          :key="s.value"
          class="filter-tab"
          :class="{ active: sourceType === s.value }"
          @click="selectType(s.value)"
        >{{ s.label }}</view>
      </view>
    </view>

    <view v-if="loading && list.length === 0" class="empty">加载中...</view>
    <view v-else-if="list.length === 0" class="empty">暂无数据</view>
    <view v-else>
      <view v-for="item in list" :key="item.id" class="card-item">
        <view class="card-item__head">
          <text class="card-item__title">{{ item.user_name || '-' }}</text>
          <text class="delta-tag" :class="item.delta >= 0 ? 'tone-verified' : 'tone-hot'">{{ item.delta >= 0 ? '+' : '' }}{{ item.delta }}</text>
        </view>
        <view class="card-item__info">
          <text>{{ pointsSourceTypeLabel(item.source_type) }}</text>
          <text>{{ formatDateTime(item.created_at) }}</text>
        </view>
        <view class="card-item__info">
          <text>余额 {{ item.balance_after }}</text>
          <text v-if="item.source_title">{{ item.source_title }}</text>
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
import { formatDateTime, pointsSourceTypeLabel } from '@/common/constants';

const list = ref([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const keywordInput = ref('');
const sourceType = ref('');

const typeOptions = [
  { label: '全部', value: '' },
  { label: '充值', value: 'recharge' },
  { label: '注册赠送', value: 'register_gift' },
  { label: '邀请奖励', value: 'invite_gift' },
  { label: '分佣收入', value: 'purchase_income' },
  { label: '分佣奖励', value: 'commission' },
  { label: '奖励', value: 'reward' },
  { label: '消费', value: 'consume' },
  { label: '过期', value: 'expire' },
  { label: '管理员调整', value: 'admin_adjust' },
];

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

async function fetchList(p = 1) {
  loading.value = true;
  try {
    const res = await adminApi.getPointsLogs({
      page: p,
      pageSize,
      keyword: keywordInput.value || undefined,
      sourceType: sourceType.value || undefined,
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
function selectType(v) { sourceType.value = v; fetchList(1); }
function goPage(p) {
  if (p < 1 || p > pageCount.value || p === page.value) return;
  fetchList(p);
}
</script>

<style lang="scss" scoped>
.admin-list-page { min-height: 100vh; background: #F2F4F5; padding: 16rpx 24rpx; }
.filter-bar { margin-bottom: 16rpx; }
.filter-input { height: 72rpx; background: #fff; border-radius: 36rpx; padding: 0 24rpx; font-size: 26rpx; }
.filter-tabs { display: flex; flex-wrap: wrap; margin-top: 16rpx; }
.filter-tab { padding: 8rpx 24rpx; margin-right: 16rpx; margin-bottom: 12rpx; border-radius: 28rpx; font-size: 24rpx; color: #7A7A7A; background: #fff; }
.filter-tab.active { color: #fff; background: #048C47; }
.card-item { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.card-item__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.card-item__title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; flex: 1; margin-right: 16rpx; }
.delta-tag { font-size: 30rpx; font-weight: 700; }
.tone-verified { color: #048C47; }
.tone-hot { color: #E54848; }
.card-item__info { display: flex; justify-content: space-between; font-size: 24rpx; color: #7A7A7A; margin-bottom: 8rpx; }
.pager { display: flex; align-items: center; justify-content: center; padding: 16rpx 0; }
.pager-btn { padding: 8rpx 28rpx; border: 1px solid #DDD; border-radius: 8rpx; font-size: 26rpx; color: #333; background: #fff; }
.pager-btn.disabled { color: #C0C0C0; border-color: #EEE; background: #F7F8F9; }
.pager-info { margin: 0 24rpx; font-size: 26rpx; color: #333; }
.pager-total { text-align: center; font-size: 24rpx; color: #B0B0B0; padding-bottom: 16rpx; }
</style>