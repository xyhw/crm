<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">操作日志</h1>
        <p class="page-sub">含充值查单、退款登记</p>
      </div>
    </div>
    <div class="filter-bar">
      <input v-model="keyword" class="input filter-search" placeholder="搜索操作人/详情" @keyup.enter="search" />
      <button class="btn btn-primary" type="button" @click="search">搜索</button>
      <button class="btn btn-ghost" type="button" @click="clearSearch">清空</button>
      <div class="tabs">
        <button
          v-for="s in actionOptions"
          :key="s.value"
          class="tab"
          :class="{ active: extra.action === s.value }"
          type="button"
          @click="setFilter('action', s.value)"
        >{{ s.label }}</button>
      </div>
      <div class="tabs">
        <button
          v-for="t in targetOptions"
          :key="t.value"
          class="tab"
          :class="{ active: extra.targetType === t.value }"
          type="button"
          @click="setFilter('targetType', t.value)"
        >{{ t.label }}</button>
      </div>
    </div>
    <StateView :loading="loading" :empty="!loading && list.length === 0" empty-title="暂无日志">
      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>操作</th>
              <th>操作人</th>
              <th>目标</th>
              <th>详情</th>
              <th>IP</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id">
              <td>{{ ACTION_LABELS[item.action] || item.action }}</td>
              <td>{{ item.admin_name || '-' }}</td>
              <td>{{ item.target_type || '-' }} #{{ item.target_id || '-' }}</td>
              <td>{{ item.detail || '-' }}</td>
              <td class="mono">{{ item.ip || '-' }}</td>
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
import { ACTION_LABELS, formatDateTime } from '../constants';
import { useList } from '../composables/useList';
import StateView from '../components/StateView.vue';
import Pagination from '../components/Pagination.vue';

const {
  list, loading, total, page, pageCount, keyword, extra, fetchList, search, clearSearch, setFilter, goPage,
} = useList((params) => adminApi.getAuditLogs(params), { pageSize: 15 });

extra.value = { action: '', targetType: '' };

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

onMounted(() => fetchList(1));
</script>
