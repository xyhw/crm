<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">充值对账</h1>
        <p class="page-sub">整单退款仅记账，不调用渠道接口</p>
      </div>
      <button class="btn btn-ghost" type="button" @click="reload">刷新</button>
    </div>

    <div v-if="summary" class="summary">
      <div class="stat-grid">
        <div class="card stat-card">
          <div class="stat-label">今日成功</div>
          <div class="stat-value">{{ summary.today?.orders || 0 }} 笔</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">今日金额</div>
          <div class="stat-value">{{ fen(summary.today?.price) }}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">今日积分</div>
          <div class="stat-value">{{ summary.today?.points || 0 }}</div>
        </div>
      </div>
      <div class="chips">
        <span v-for="s in summary.byStatus || []" :key="s.status" class="badge badge-muted">
          {{ statusLabel(s.status) }} {{ s.orders }}
        </span>
      </div>
      <div class="reconcile" :class="{ warn: hasLedgerGap }">
        对账：已支付订单 {{ summary.reconcile?.paidOrderPoints }} 积分 / 已入账 {{ summary.reconcile?.ledgerRechargePoints }} 积分
        <span v-if="summary.reconcile?.missingLedgerOrders">，{{ summary.reconcile.missingLedgerOrders }} 笔未入账（{{ summary.reconcile.missingLedgerPoints }} 积分），请核查</span>
        <span v-else-if="hasLedgerGap">，差额 {{ summary.reconcile?.diff }}，请核查</span>
        <span v-else>，一致</span>
      </div>
      <div v-if="summary.refund?.orders" class="reconcile" :class="{ warn: hasRefundGap }">
        退款：{{ summary.refund.orders }} 笔 / {{ fen(summary.refund.refundPrice) }} / 扣回 {{ summary.refund.points }} 积分
        <span v-if="summary.refund.missingLedgerOrders">，{{ summary.refund.missingLedgerOrders }} 笔未冲销，请核查</span>
        <span v-else>，已冲销</span>
      </div>
    </div>

    <div class="filter-bar">
      <input v-model="keyword" class="input filter-search" placeholder="搜索用户昵称/手机号" @keyup.enter="search" />
      <button class="btn btn-primary" type="button" @click="search">搜索</button>
      <button class="btn btn-ghost" type="button" @click="clearSearch">清空</button>
      <div class="tabs">
        <button
          v-for="s in statusOptions"
          :key="s.value"
          class="tab"
          :class="{ active: extra.status === s.value }"
          type="button"
          @click="setFilter('status', s.value)"
        >{{ s.label }}</button>
      </div>
      <div class="tabs">
        <button
          v-for="c in channelOptions"
          :key="c.value"
          class="tab"
          :class="{ active: extra.channel === c.value }"
          type="button"
          @click="setFilter('channel', c.value)"
        >{{ c.label }}</button>
      </div>
    </div>

    <StateView :loading="loading" :empty="!loading && list.length === 0" empty-title="暂无充值订单">
      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>订单号</th>
              <th>用户</th>
              <th>渠道</th>
              <th>积分 / 金额</th>
              <th>状态</th>
              <th>渠道单号</th>
              <th>时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id">
              <td class="mono">{{ item.order_no }}</td>
              <td>{{ item.user_name || '-' }} {{ item.user_phone || '' }}</td>
              <td>{{ channelLabel(item.channel) }}</td>
              <td class="mono">{{ item.amount }} / {{ fen(item.price) }}</td>
              <td>
                <span class="badge" :class="badgeTone(item.status)">{{ statusLabel(item.status) }}</span>
                <div v-if="item.status === 'refunded'" class="mini">退款 {{ fen(item.refund_amount) }} · {{ formatDateTime(item.refunded_at) }}</div>
              </td>
              <td class="mono">{{ item.pay_channel_order_no || '-' }}</td>
              <td>{{ formatDateTime(item.paid_at || item.created_at) }}</td>
              <td>
                <div class="row-actions">
                  <button
                    v-if="item.status === 'pending'"
                    class="btn btn-ghost"
                    type="button"
                    :disabled="syncing === item.order_no"
                    @click="doSync(item)"
                  >{{ syncing === item.order_no ? '查单中' : '查单补账' }}</button>
                  <button
                    v-if="item.status === 'paid'"
                    class="btn btn-danger-ghost"
                    type="button"
                    @click="openRefund(item)"
                  >登记退款</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination :page="page" :page-count="pageCount" :total="total" @change="goPage" />
    </StateView>

    <Modal v-model="refundOpen" title="登记退款">
      <p class="warn">系统不会调用渠道退款接口。请先在渠道后台完成退款，再在此登记。</p>
      <p v-if="refundTarget" class="mono">{{ refundTarget.order_no }} · {{ refundTarget.amount }} 积分 · {{ fen(refundTarget.price) }}</p>
      <label class="field">
        <span class="field-label">退款原因<span class="required">*</span></span>
        <textarea v-model="refundReason" class="textarea" placeholder="至少 2 个字" maxlength="180" :disabled="refunding" />
      </label>
      <label class="field">
        <span class="field-label">渠道退款单号（选填）</span>
        <input v-model="refundChannelNo" class="input" :disabled="refunding" />
      </label>
      <p class="warn">将扣回 {{ refundTarget?.amount }} 积分；余额不足时会扣为负值，需用户补足后才能继续消费。</p>
      <template #footer>
        <button class="btn btn-ghost" type="button" :disabled="refunding" @click="refundOpen = false">取消</button>
        <button class="btn btn-danger" type="button" :disabled="refunding" @click="doRefund">
          {{ refunding ? '提交中' : '确认登记' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { adminApi } from '../api/client';
import { badgeTone, CHANNEL_LABEL, fen, formatDateTime, RECHARGE_STATUS } from '../constants';
import { useList } from '../composables/useList';
import { useToastStore } from '../stores/toast';
import StateView from '../components/StateView.vue';
import Pagination from '../components/Pagination.vue';
import Modal from '../components/Modal.vue';

const toast = useToastStore();
const summary = ref(null);
const syncing = ref('');
const refundOpen = ref(false);
const refundTarget = ref(null);
const refundReason = ref('');
const refundChannelNo = ref('');
const refunding = ref(false);

const {
  list, loading, total, page, pageCount, keyword, extra, fetchList, search, clearSearch, setFilter, goPage,
} = useList((params) => adminApi.getRechargeOrders(params), { pageSize: 20 });

extra.value = { status: '', channel: '' };

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

const hasLedgerGap = computed(() => {
  const r = summary.value?.reconcile;
  if (!r) return false;
  return Number(r.diff) !== 0 || Number(r.missingLedgerOrders) > 0;
});
const hasRefundGap = computed(() => Number(summary.value?.refund?.missingLedgerOrders || 0) > 0);

function statusLabel(v) {
  return RECHARGE_STATUS[v] || v || '-';
}
function channelLabel(v) {
  return CHANNEL_LABEL[v] || v || '-';
}

async function fetchSummary() {
  try {
    summary.value = await adminApi.getRechargeSummary();
  } catch {
    summary.value = null;
  }
}

async function reload() {
  await Promise.all([fetchSummary(), fetchList(page.value)]);
}

async function doSync(item) {
  if (syncing.value) return;
  syncing.value = item.order_no;
  try {
    const res = await adminApi.syncRechargeOrder(item.order_no);
    toast.success(res?.settled ? '已补记积分' : '渠道侧未支付');
    await reload();
  } catch (e) {
    toast.error(e.message || '查单失败');
  } finally {
    syncing.value = '';
  }
}

function openRefund(item) {
  refundTarget.value = item;
  refundReason.value = '';
  refundChannelNo.value = '';
  refundOpen.value = true;
}

async function doRefund() {
  if (refunding.value || !refundTarget.value) return;
  const reason = refundReason.value.trim();
  if (reason.length < 2) {
    toast.error('请填写退款原因');
    return;
  }
  refunding.value = true;
  try {
    const res = await adminApi.refundRechargeOrder(refundTarget.value.order_no, {
      reason,
      channelRefundNo: refundChannelNo.value.trim() || undefined,
    });
    refundOpen.value = false;
    toast.success(res?.shortfall > 0 ? `已登记，余额不足 ${res.shortfall}` : '已登记退款');
    await reload();
  } catch (e) {
    toast.error(e.message || '退款登记失败');
  } finally {
    refunding.value = false;
  }
}

onMounted(async () => {
  await fetchSummary();
  await fetchList(1);
});
</script>

<style scoped>
.summary { margin-bottom: 18px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
.reconcile {
  background: var(--color-success-bg);
  color: var(--color-success);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  margin-top: 8px;
}
.reconcile.warn {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}
.warn { color: var(--color-warning); font-size: 13px; margin: 0; }
.mini { font-size: 11px; color: var(--color-muted-fg); margin-top: 4px; }
</style>
