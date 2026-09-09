<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">积分流水</h1>
        <p class="page-sub">含充值、消费、退款扣回；余额可为负</p>
      </div>
    </div>
    <div class="filter-bar">
      <input v-model="keyword" class="input filter-search" placeholder="搜索用户手机号/昵称" @keyup.enter="search" />
      <button class="btn btn-primary" type="button" @click="search">搜索</button>
      <button class="btn btn-ghost" type="button" @click="clearSearch">清空</button>
      <div class="tabs">
        <button
          v-for="s in typeOptions"
          :key="s.value"
          class="tab"
          :class="{ active: extra.sourceType === s.value }"
          type="button"
          @click="setFilter('sourceType', s.value)"
        >{{ s.label }}</button>
      </div>
    </div>
    <StateView :loading="loading" :empty="!loading && list.length === 0" empty-title="暂无积分记录">
      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>用户</th>
              <th>变动</th>
              <th>余额</th>
              <th>类型</th>
              <th>说明</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id">
              <td>{{ item.user_name || '-' }}</td>
              <td class="mono" :class="item.delta >= 0 ? 'pos' : 'neg'">{{ item.delta >= 0 ? '+' : '' }}{{ item.delta }}</td>
              <td class="mono" :class="{ neg: Number(item.balance_after) < 0 }">{{ item.balance_after }}</td>
              <td>{{ pointsSourceTypeLabel(item.source_type) }}</td>
              <td>{{ item.source_title || '-' }}</td>
              <td>{{ formatDateTime(item.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination :page="page" :page-count="pageCount" :total="total" @change="goPage" />
    </StateView>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { adminApi } from '../api/client';
import { formatDateTime, pointsSourceTypeLabel } from '../constants';
import { useList } from '../composables/useList';
import StateView from '../components/StateView.vue';
import Pagination from '../components/Pagination.vue';

const {
  list, loading, total, page, pageCount, keyword, extra, fetchList, search, clearSearch, setFilter, goPage,
} = useList((params) => adminApi.getPointsLogs(params), { pageSize: 20 });

extra.value = { sourceType: '' };
const typeOptions = [
  { label: '全部', value: '' },
  { label: '充值', value: 'recharge' },
  { label: '退款扣回', value: 'refund' },
  { label: '注册赠送', value: 'register_gift' },
  { label: '邀请奖励', value: 'invite_gift' },
  { label: '分佣收入', value: 'purchase_income' },
  { label: '分佣奖励', value: 'commission' },
  { label: '奖励', value: 'reward' },
  { label: '消费', value: 'consume' },
  { label: '过期', value: 'expire' },
  { label: '管理员调整', value: 'admin_adjust' },
];

onMounted(() => fetchList(1));
</script>

<style scoped>
.pos { color: var(--color-success); }
.neg { color: var(--color-destructive); }
</style>
