<template>
  <view class="admin-list-page">
    <view class="filter-bar">
      <SearchBar v-model="keywordInput" placeholder="搜索商机标题/买家" @search="onSearch" @clear="onClear" />
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
      empty-title="暂无订单"
      empty-desc="暂无符合条件的订单记录"
      :skeleton-count="4"
    >
      <view v-for="item in list" :key="item.id" class="card-item" @click="openDetail(item)">
        <view class="card-item__head">
          <text class="card-item__title">订单 #{{ item.order_no }}</text>
          <text class="status-tag" :class="'tone-' + statusTone(item.status)">{{ orderStatusLabel(item.status) }}</text>
        </view>
        <view class="card-item__info"><text>{{ item.opportunity_title || '-' }}</text></view>
        <view class="card-item__info">
          <text>买家：{{ item.buyer_name || '-' }}</text>
          <text>卖家：{{ item.seller_name || '-' }}</text>
        </view>
        <view class="card-item__info">
          <text>成交价 {{ item.actual_price }} 积分</text>
          <text>佣金 {{ item.platform_commission }} · 收入 {{ item.seller_income }}</text>
        </view>
        <view class="card-item__info">
          <text>下单 {{ formatDate(item.created_at) }}</text>
          <text>{{ item.order_no }}</text>
        </view>
      </view>
    </StateView>

    <Pagination :page="page" :page-count="pageCount" :total="total" @change="goPage" />

    <view v-if="detail" class="modal-mask" @click="detail = null">
      <view class="modal-box" @click.stop>
        <view class="modal-title">订单 #{{ detail.order_no }}</view>
        <view class="modal-row"><text class="modal-label">商机</text><text>{{ detail.opportunity_title }}</text></view>
        <view class="modal-row"><text class="modal-label">买家</text><text>{{ detail.buyer_name }}</text></view>
        <view class="modal-row"><text class="modal-label">卖家</text><text>{{ detail.seller_name }}</text></view>
        <view class="modal-row"><text class="modal-label">成交价</text><text>{{ detail.actual_price }} 积分</text></view>
        <view class="modal-row"><text class="modal-label">平台佣金</text><text>{{ detail.platform_commission }} 积分</text></view>
        <view class="modal-row"><text class="modal-label">卖家收入</text><text>{{ detail.seller_income }} 积分</text></view>
        <view class="modal-row"><text class="modal-label">状态</text><text>{{ orderStatusLabel(detail.status) }}</text></view>
        <view class="modal-row"><text class="modal-label">下单时间</text><text>{{ formatDate(detail.created_at) }}</text></view>
        <view class="modal-row"><text class="modal-label">支付时间</text><text>{{ formatDate(detail.paid_at) }}</text></view>
        <view class="modal-row"><text class="modal-label">完成时间</text><text>{{ formatDate(detail.completed_at) }}</text></view>
        <view class="modal-btn" @click="detail = null">关闭</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/admin/adminApi';
import { formatDate, orderStatusLabel } from '@/common/constants';
import SearchBar from '@/components/SearchBar.vue';
import Pagination from '@/components/Pagination.vue';
import StateView from '@/components/StateView.vue';

const list = ref([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = 10;
const keywordInput = ref('');
const status = ref('');
const detail = ref(null);

const statusOptions = [
  { label: '全部', value: '' },
  { label: '待支付', value: 'pending' },
  { label: '已支付', value: 'paid' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
  { label: '退款中', value: 'refunding' },
  { label: '已退款', value: 'refunded' },
];

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

function statusTone(s) {
  if (s === 'completed' || s === 'paid') return 'verified';
  if (s === 'pending' || s === 'refunding') return 'warn';
  if (s === 'cancelled' || s === 'refunded') return 'hot';
  return 'default';
}

async function fetchList(p = 1) {
  loading.value = true;
  try {
    const res = await adminApi.getOrders({
      page: p,
      pageSize,
      status: status.value || undefined,
      keyword: keywordInput.value || undefined,
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

function onSearch() { fetchList(1); }
function onClear() { fetchList(1); }
function selectStatus(s) { status.value = s; fetchList(1); }
function applyFilter() { fetchList(1); }
function goPage(p) {
  if (p < 1 || p > pageCount.value || p === page.value) return;
  fetchList(p);
}

function openDetail(item) {
  detail.value = item;
}
</script>

<style lang="scss" scoped>
.admin-list-page { min-height: 100vh; background: #F2F4F5; padding: 16rpx 24rpx 140rpx; }
.filter-bar { margin-bottom: 16rpx; }
.filter-tabs { display: flex; flex-wrap: wrap; margin-top: 16rpx; }
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
.modal-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 999; display: flex; align-items: flex-end; }
.modal-box { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom)); max-height: 80vh; overflow-y: auto; }
.modal-title { font-size: 32rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 24rpx; text-align: center; }
.modal-row { display: flex; padding: 12rpx 0; font-size: 26rpx; color: #333; border-bottom: 1px solid #F5F5F5; }
.modal-label { width: 160rpx; color: #7A7A7A; flex-shrink: 0; }
.modal-btn { margin-top: 32rpx; height: 80rpx; line-height: 80rpx; text-align: center; background: #048C47; color: #fff; border-radius: 40rpx; font-size: 28rpx; }
</style>
