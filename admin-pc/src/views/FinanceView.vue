<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">财务看板</h1>
        <p class="page-sub">订单营收与积分概况</p>
      </div>
      <button class="btn btn-ghost" type="button" @click="load">刷新</button>
    </div>
    <div v-if="loading" class="loading">加载中...</div>
    <template v-else>
      <div class="stat-grid">
        <div class="card stat-card"><div class="stat-label">今日订单</div><div class="stat-value">{{ data.today?.orders || 0 }}</div></div>
        <div class="card stat-card"><div class="stat-label">今日营收(积分)</div><div class="stat-value">{{ data.today?.amount || 0 }}</div></div>
        <div class="card stat-card"><div class="stat-label">累计订单</div><div class="stat-value">{{ data.total?.orders || 0 }}</div></div>
        <div class="card stat-card"><div class="stat-label">累计营收</div><div class="stat-value">{{ data.total?.amount || 0 }}</div></div>
        <div class="card stat-card"><div class="stat-label">平台抽成累计</div><div class="stat-value">{{ data.total?.platform || 0 }}</div></div>
        <div class="card stat-card"><div class="stat-label">卖家收入累计</div><div class="stat-value">{{ data.total?.seller || 0 }}</div></div>
        <div class="card stat-card"><div class="stat-label">活跃用户</div><div class="stat-value">{{ data.users?.active || 0 }}</div></div>
        <div class="card stat-card"><div class="stat-label">在架商机</div><div class="stat-value">{{ data.opportunities?.active || 0 }}</div></div>
      </div>
      <h2 class="sec">积分概况</h2>
      <div class="stat-grid">
        <div class="card stat-card"><div class="stat-label">积分存量</div><div class="stat-value">{{ Number(data.points?.balance ?? 0) }}</div></div>
        <div class="card stat-card"><div class="stat-label">累计充值</div><div class="stat-value">{{ data.points?.recharged || 0 }}</div></div>
        <div class="card stat-card"><div class="stat-label">累计消费</div><div class="stat-value">{{ data.points?.consumed || 0 }}</div></div>
        <div class="card stat-card"><div class="stat-label">累计过期</div><div class="stat-value">{{ data.points?.expired || 0 }}</div></div>
      </div>
      <h2 class="sec">近 7 天交易趋势</h2>
      <div class="card table-wrap">
        <table v-if="(data.trend || []).length" class="data">
          <thead><tr><th>日期</th><th>笔数</th><th>金额</th></tr></thead>
          <tbody>
            <tr v-for="(d, i) in data.trend" :key="i">
              <td>{{ d.date }}</td>
              <td class="mono">{{ d.count }}</td>
              <td class="mono">{{ d.amount }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty">暂无趋势数据</div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { adminApi } from '../api/client';
import { useToastStore } from '../stores/toast';

const toast = useToastStore();
const loading = ref(true);
const data = reactive({});

async function load() {
  loading.value = true;
  try {
    Object.assign(data, (await adminApi.getFinance()) || {});
  } catch (e) {
    toast.error(e.message || '获取失败');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.sec {
  margin: 24px 0 12px;
  font-size: 15px;
}
</style>
