<template>
  <view class="admin-list-page">
    <view class="summary-card" v-if="summary">
      <view class="summary-row">
        <view class="summary-cell">
          <text class="summary-label">今日成功</text>
          <text class="summary-value">{{ summary.today.orders || 0 }} 笔</text>
        </view>
        <view class="summary-cell">
          <text class="summary-label">今日金额</text>
          <text class="summary-value">{{ fen(summary.today.price) }}</text>
        </view>
        <view class="summary-cell">
          <text class="summary-label">今日积分</text>
          <text class="summary-value">{{ summary.today.points || 0 }}</text>
        </view>
      </view>
      <view class="summary-status">
        <text v-for="s in summary.byStatus" :key="s.status" class="status-chip">
          {{ statusLabel(s.status) }} {{ s.orders }}
        </text>
      </view>
      <view class="reconcile" :class="{ warn: hasLedgerGap }">
        对账：已支付订单 {{ summary.reconcile.paidOrderPoints }} 积分 / 已入账 {{ summary.reconcile.ledgerRechargePoints }} 积分
        <text v-if="summary.reconcile.missingLedgerOrders">，{{ summary.reconcile.missingLedgerOrders }} 笔未入账（{{ summary.reconcile.missingLedgerPoints }} 积分），请核查</text>
        <text v-else-if="hasLedgerGap">，差额 {{ summary.reconcile.diff }}，请核查</text>
        <text v-else>，一致</text>
      </view>
      <view v-if="summary.refund && summary.refund.orders" class="reconcile" :class="{ warn: hasRefundGap }">
        退款：{{ summary.refund.orders }} 笔 / {{ fen(summary.refund.refundPrice) }} / 扣回 {{ summary.refund.points }} 积分
        <text v-if="summary.refund.missingLedgerOrders">，{{ summary.refund.missingLedgerOrders }} 笔未冲销，请核查</text>
        <text v-else>，已冲销</text>
      </view>
    </view>

    <view class="filter-bar">
      <SearchBar v-model="keywordInput" placeholder="搜索用户昵称/手机号" @search="onSearch" @clear="onClear" />
      <view class="filter-tabs">
        <view
          v-for="s in statusOptions"
          :key="s.value"
          class="filter-tab"
          :class="{ active: status === s.value }"
          @click="selectStatus(s.value)"
        >{{ s.label }}</view>
      </view>
      <view class="filter-tabs">
        <view
          v-for="c in channelOptions"
          :key="c.value"
          class="filter-tab"
          :class="{ active: channel === c.value }"
          @click="selectChannel(c.value)"
        >{{ c.label }}</view>
      </view>
    </view>

    <StateView
      :loading="loading"
      :empty="!loading && list.length === 0"
      empty-title="暂无充值订单"
      empty-desc="暂无符合条件的充值记录"
      :skeleton-count="4"
    >
      <view v-for="item in list" :key="item.id" class="card-item">
        <view class="card-item__head">
          <text class="card-item__title">{{ item.order_no }}</text>
          <text class="status-tag" :class="statusTone(item.status)">{{ statusLabel(item.status) }}</text>
        </view>
        <view class="card-item__info">
          <text>{{ item.user_name || '-' }} {{ item.user_phone || '' }}</text>
          <text>{{ channelLabel(item.channel) }}</text>
        </view>
        <view class="card-item__info">
          <text>{{ item.amount }} 积分 / {{ fen(item.price) }}</text>
          <text>{{ formatDateTime(item.paid_at || item.created_at) }}</text>
        </view>
        <view class="card-item__info" v-if="item.pay_channel_order_no">
          <text class="mono">渠道单号 {{ item.pay_channel_order_no }}</text>
        </view>
        <view class="card-item__info" v-if="item.status === 'refunded'">
          <text class="mono">退款 {{ fen(item.refund_amount) }} · {{ formatDateTime(item.refunded_at) }}</text>
        </view>
        <view class="card-item__actions" v-if="item.status === 'pending' || item.status === 'paid'">
          <view
            v-if="item.status === 'pending'"
            class="action-btn"
            :class="{ disabled: syncing === item.order_no }"
            @click="doSync(item)"
          >{{ syncing === item.order_no ? '查单中' : '查单补账' }}</view>
          <view
            v-if="item.status === 'paid'"
            class="action-btn action-btn--danger"
            @click="openRefund(item)"
          >登记退款</view>
        </view>
      </view>
    </StateView>

    <Pagination :page="page" :page-count="pageCount" :total="total" @change="goPage" />

    <view v-if="refundTarget" class="modal-mask" @click="closeRefund">
      <view class="modal-box" @click.stop>
        <view class="modal-title">登记退款</view>
        <view class="modal-tip">
          系统不会调用渠道退款接口。请先在渠道后台完成退款，再在此登记。
        </view>
        <view class="modal-order">
          {{ refundTarget.order_no }} · {{ refundTarget.amount }} 积分 · {{ fen(refundTarget.price) }}
        </view>
        <textarea
          v-model="refundReason"
          class="modal-input"
          placeholder="退款原因（必填，至少 2 个字）"
          maxlength="180"
          :disabled="refunding"
        />
        <input
          v-model="refundChannelNo"
          class="modal-line-input"
          placeholder="渠道退款单号（选填）"
          :disabled="refunding"
        />
        <view class="modal-warn">
          将扣回 {{ refundTarget.amount }} 积分；余额不足时会扣为负值，需用户补足后才能继续消费。
        </view>
        <view class="modal-actions">
          <view class="modal-btn modal-btn--cancel" @click="closeRefund">取消</view>
          <view class="modal-btn modal-btn--danger" :class="{ disabled: refunding }" @click="doRefund">
            {{ refunding ? '提交中' : '确认登记' }}
          </view>
        </view>
      </view>
    </view>
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
const summary = ref(null);
const loading = ref(false);
const syncing = ref('');
const refundTarget = ref(null);
const refundReason = ref('');
const refundChannelNo = ref('');
const refunding = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const keywordInput = ref('');
const status = ref('');
const channel = ref('');

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '待支付', value: 'pending' },
  { label: '已支付', value: 'paid' },
  { label: '已过期', value: 'expired' },
  { label: '失败', value: 'failed' },
  { label: '已退款', value: 'refunded' },
];

const channelOptions = [
  { label: '全部渠道', value: '' },
  { label: '虚拟支付', value: 'wechat' },
  { label: 'Waffo', value: 'waffo' },
  { label: 'Mock', value: 'mock' },
];

const STATUS_LABEL = {
  pending: '待支付',
  paid: '已支付',
  failed: '失败',
  expired: '已过期',
  refunded: '已退款',
};
const CHANNEL_LABEL = {
  wechat: '虚拟支付',
  waffo: 'Waffo',
  mock: 'Mock',
  alipay: '支付宝',
  stripe: 'Stripe',
};

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

const hasLedgerGap = computed(() => {
  const r = summary.value?.reconcile;
  if (!r) return false;
  return Number(r.diff) !== 0 || Number(r.missingLedgerOrders) > 0;
});

const hasRefundGap = computed(() => Number(summary.value?.refund?.missingLedgerOrders || 0) > 0);

function statusLabel(v) { return STATUS_LABEL[v] || v || '-'; }
function channelLabel(v) { return CHANNEL_LABEL[v] || v || '-'; }
function statusTone(v) {
  if (v === 'paid') return 'tone-ok';
  if (v === 'pending') return 'tone-warn';
  return 'tone-fail';
}
function fen(v) { return `¥${((Number(v) || 0) / 100).toFixed(2)}`; }

async function fetchSummary() {
  try {
    summary.value = await adminApi.getRechargeSummary();
  } catch {
    summary.value = null;
  }
}

async function fetchList(p = 1) {
  loading.value = true;
  try {
    const res = await adminApi.getRechargeOrders({
      page: p,
      pageSize,
      keyword: keywordInput.value || undefined,
      status: status.value || undefined,
      channel: channel.value || undefined,
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

onShow(() => {
  fetchSummary();
  fetchList(1);
});

function onSearch() { fetchList(1); }
function onClear() { fetchList(1); }
function selectStatus(v) { status.value = v; fetchList(1); }
function selectChannel(v) { channel.value = v; fetchList(1); }
function goPage(p) {
  if (p < 1 || p > pageCount.value || p === page.value) return;
  fetchList(p);
}

async function doSync(item) {
  if (syncing.value) return;
  syncing.value = item.order_no;
  try {
    const res = await adminApi.syncRechargeOrder(item.order_no);
    uni.showToast({ title: res?.settled ? '已补记积分' : '渠道侧未支付', icon: 'none' });
    await Promise.all([fetchSummary(), fetchList(page.value)]);
  } catch (e) {
    uni.showToast({ title: e.message || '查单失败', icon: 'none' });
  } finally {
    syncing.value = '';
  }
}

function openRefund(item) {
  refundTarget.value = item;
  refundReason.value = '';
  refundChannelNo.value = '';
}

function closeRefund() {
  if (refunding.value) return;
  refundTarget.value = null;
}

async function doRefund() {
  if (refunding.value || !refundTarget.value) return;
  const reason = refundReason.value.trim();
  if (reason.length < 2) {
    uni.showToast({ title: '请填写退款原因', icon: 'none' });
    return;
  }
  refunding.value = true;
  try {
    const res = await adminApi.refundRechargeOrder(refundTarget.value.order_no, {
      reason,
      channelRefundNo: refundChannelNo.value.trim() || undefined,
    });
    refundTarget.value = null;
    uni.showToast({
      title: res?.shortfall > 0 ? `已登记，余额不足 ${res.shortfall}` : '已登记退款',
      icon: 'none',
    });
    await Promise.all([fetchSummary(), fetchList(page.value)]);
  } catch (e) {
    uni.showToast({ title: e.message || '退款登记失败', icon: 'none' });
  } finally {
    refunding.value = false;
  }
}
</script>

<style lang="scss" scoped>
.admin-list-page { touch-action: manipulation;
  min-height: 100dvh; background: #F2F4F5; padding: 16rpx 24rpx 140rpx; }
.summary-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.summary-row { display: flex; justify-content: space-between; margin-bottom: 16rpx; }
.summary-cell { flex: 1; display: flex; flex-direction: column; }
.summary-label { font-size: 22rpx; color: #999999; margin-bottom: 8rpx; }
.summary-value { font-size: 32rpx; font-weight: 700; color: #1A1A1A; }
.summary-status { display: flex; flex-wrap: wrap; margin-bottom: 12rpx; }
.status-chip { font-size: 22rpx; color: #555555; background: #F2F4F5; border-radius: 20rpx; padding: 6rpx 16rpx; margin: 0 12rpx 8rpx 0; }
.reconcile { font-size: 22rpx; color: #037539; line-height: 1.5; }
.reconcile.warn { color: #E54848; }
.filter-bar { margin-bottom: 16rpx; }
.filter-tabs { display: flex; flex-wrap: wrap; margin-top: 16rpx; }
.filter-tab { min-height: 72rpx; line-height: 72rpx; padding: 0 24rpx; margin-right: 16rpx; margin-bottom: 12rpx; border-radius: 28rpx; font-size: 24rpx; color: #555555; background: #fff; }
.filter-tab.active { color: #fff; background: #037539; }
.card-item { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.card-item__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.card-item__title { font-size: 28rpx; font-weight: 600; color: #1A1A1A; flex: 1; margin-right: 16rpx; }
.status-tag { font-size: 24rpx; font-weight: 600; }
.tone-ok { color: #037539; }
.tone-warn { color: #E8920A; }
.tone-fail { color: #E54848; }
.card-item__info { display: flex; justify-content: space-between; font-size: 24rpx; color: #555555; margin-bottom: 8rpx; }
.mono { font-size: 22rpx; color: #999999; }
.card-item__actions { display: flex; justify-content: flex-end; margin-top: 12rpx; }
.action-btn { min-height: 64rpx; line-height: 64rpx; padding: 0 28rpx; border-radius: 32rpx; font-size: 24rpx; color: #fff; background: #037539; }
.action-btn.disabled { background: #A8C9B6; }
.action-btn--danger { background: #E54848; }
.modal-mask { position: fixed; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-box { width: 600rpx; background: #fff; border-radius: 20rpx; padding: 32rpx; }
.modal-title { font-size: 32rpx; font-weight: 700; color: #1A1A1A; margin-bottom: 16rpx; }
.modal-tip { font-size: 22rpx; color: #E8920A; line-height: 1.5; margin-bottom: 16rpx; }
.modal-order { font-size: 24rpx; color: #555555; background: #F2F4F5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 16rpx; }
.modal-input { width: 100%; box-sizing: border-box; height: 160rpx; border: 2rpx solid #E5E5E5; border-radius: 12rpx; padding: 16rpx; font-size: 26rpx; color: #1A1A1A; margin-bottom: 16rpx; }
.modal-line-input { width: 100%; box-sizing: border-box; height: 80rpx; border: 2rpx solid #E5E5E5; border-radius: 12rpx; padding: 0 16rpx; font-size: 26rpx; color: #1A1A1A; margin-bottom: 16rpx; }
.modal-warn { font-size: 22rpx; color: #E54848; line-height: 1.5; margin-bottom: 24rpx; }
.modal-actions { display: flex; }
.modal-btn { flex: 1; min-height: 80rpx; line-height: 80rpx; text-align: center; border-radius: 40rpx; font-size: 28rpx; }
.modal-btn--cancel { color: #555555; background: #F2F4F5; margin-right: 20rpx; }
.modal-btn--danger { color: #fff; background: #E54848; }
.modal-btn--danger.disabled { background: #F0A3A3; }
</style>
