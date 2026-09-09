<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">订单管理</h1>
        <p class="page-sub">商机成交订单</p>
      </div>
    </div>
    <div class="filter-bar">
      <input v-model="keyword" class="input filter-search" placeholder="搜索商机标题/买家" @keyup.enter="search" />
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
    </div>
    <StateView :loading="loading" :empty="!loading && list.length === 0" empty-title="暂无订单">
      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>订单号</th>
              <th>商机</th>
              <th>买家</th>
              <th>卖家</th>
              <th>成交价</th>
              <th>佣金 / 收入</th>
              <th>状态</th>
              <th>下单时间</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id">
              <td class="mono">{{ item.order_no }}</td>
              <td>{{ item.opportunity_title || '-' }}</td>
              <td>{{ item.buyer_name || '-' }}</td>
              <td>{{ item.seller_name || '-' }}</td>
              <td class="mono">{{ item.actual_price }}</td>
              <td class="mono">{{ item.platform_commission }} / {{ item.seller_income }}</td>
              <td><span class="badge" :class="badgeTone(item.status)">{{ orderStatusLabel(item.status) }}</span></td>
              <td>{{ formatDate(item.created_at) }}</td>
              <td><button class="btn btn-ghost" type="button" @click="detail = item; detailOpen = true">详情</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination :page="page" :page-count="pageCount" :total="total" @change="goPage" />
    </StateView>

    <Modal v-model="detailOpen" title="订单详情">
      <template v-if="detail">
        <div class="kv"><span>订单号</span><b class="mono">{{ detail.order_no }}</b></div>
        <div class="kv"><span>商机</span><b>{{ detail.opportunity_title }}</b></div>
        <div class="kv"><span>买家</span><b>{{ detail.buyer_name }}</b></div>
        <div class="kv"><span>卖家</span><b>{{ detail.seller_name }}</b></div>
        <div class="kv"><span>成交价</span><b>{{ detail.actual_price }} 积分</b></div>
        <div class="kv"><span>平台佣金</span><b>{{ detail.platform_commission }} 积分</b></div>
        <div class="kv"><span>卖家收入</span><b>{{ detail.seller_income }} 积分</b></div>
        <div class="kv"><span>状态</span><b>{{ orderStatusLabel(detail.status) }}</b></div>
        <div class="kv"><span>下单时间</span><b>{{ formatDate(detail.created_at) }}</b></div>
        <div class="kv"><span>支付时间</span><b>{{ formatDate(detail.paid_at) }}</b></div>
        <div class="kv"><span>完成时间</span><b>{{ formatDate(detail.completed_at) }}</b></div>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { adminApi } from '../api/client';
import { badgeTone, formatDate, orderStatusLabel } from '../constants';
import { useList } from '../composables/useList';
import StateView from '../components/StateView.vue';
import Pagination from '../components/Pagination.vue';
import Modal from '../components/Modal.vue';

const {
  list, loading, total, page, pageCount, keyword, extra, fetchList, search, clearSearch, setFilter, goPage,
} = useList((params) => adminApi.getOrders(params), { pageSize: 10 });

extra.value = { status: '' };
const statusOptions = [
  { label: '全部', value: '' },
  { label: '待支付', value: 'pending' },
  { label: '已支付', value: 'paid' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
  { label: '退款中', value: 'refunding' },
  { label: '已退款', value: 'refunded' },
];

const detailOpen = ref(false);
const detail = ref(null);

onMounted(() => fetchList(1));
</script>

<style scoped>
.kv {
  display: flex;
  gap: 12px;
  font-size: 13px;
}
.kv span {
  width: 90px;
  color: var(--color-muted-fg);
  flex-shrink: 0;
}
.kv b { font-weight: 500; }
</style>
