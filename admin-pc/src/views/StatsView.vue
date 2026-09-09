<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">数据统计</h1>
        <p class="page-sub">近 7 天趋势与分布</p>
      </div>
      <button class="btn btn-ghost" type="button" @click="load">刷新</button>
    </div>
    <div v-if="loading" class="loading">加载中...</div>
    <template v-else>
      <div class="stat-grid">
        <div class="card stat-card"><div class="stat-label">总用户</div><div class="stat-value">{{ dashboard.totalUsers || 0 }}</div></div>
        <div class="card stat-card"><div class="stat-label">总商机</div><div class="stat-value">{{ dashboard.totalOpportunities || 0 }}</div></div>
        <div class="card stat-card"><div class="stat-label">总订单</div><div class="stat-value">{{ dashboard.totalOrders || 0 }}</div></div>
        <div class="card stat-card"><div class="stat-label">总积分</div><div class="stat-value">{{ Number(dashboard.totalPoints ?? 0) }}</div></div>
        <div class="card stat-card"><div class="stat-label">今日订单</div><div class="stat-value">{{ dashboard.todayOrders || 0 }}</div></div>
        <div class="card stat-card"><div class="stat-label">今日收入</div><div class="stat-value">{{ dashboard.todayRevenue || 0 }}</div></div>
      </div>

      <div class="grid-2">
        <section class="card block">
          <h2>新用户</h2>
          <div v-if="!(trends.users || []).length" class="empty">暂无数据</div>
          <table v-else class="data">
            <thead><tr><th>日期</th><th>数量</th></tr></thead>
            <tbody>
              <tr v-for="(d, i) in trends.users" :key="i"><td>{{ d.date }}</td><td class="mono">{{ d.count }}</td></tr>
            </tbody>
          </table>
        </section>
        <section class="card block">
          <h2>新商机</h2>
          <div v-if="!(trends.opportunities || []).length" class="empty">暂无数据</div>
          <table v-else class="data">
            <thead><tr><th>日期</th><th>数量</th></tr></thead>
            <tbody>
              <tr v-for="(d, i) in trends.opportunities" :key="i"><td>{{ d.date }}</td><td class="mono">{{ d.count }}</td></tr>
            </tbody>
          </table>
        </section>
        <section class="card block">
          <h2>收入</h2>
          <div v-if="!(trends.revenue || []).length" class="empty">暂无数据</div>
          <table v-else class="data">
            <thead><tr><th>日期</th><th>积分</th></tr></thead>
            <tbody>
              <tr v-for="(d, i) in trends.revenue" :key="i"><td>{{ d.date }}</td><td class="mono">{{ d.amount }}</td></tr>
            </tbody>
          </table>
        </section>
        <section class="card block">
          <h2>商机分类分布</h2>
          <div v-if="!(distribution.oppCategories || []).length" class="empty">暂无数据</div>
          <table v-else class="data">
            <thead><tr><th>分类</th><th>数量</th></tr></thead>
            <tbody>
              <tr v-for="(d, i) in distribution.oppCategories" :key="i"><td>{{ d.name }}</td><td class="mono">{{ d.count }}</td></tr>
            </tbody>
          </table>
        </section>
        <section class="card block">
          <h2>用户等级分布</h2>
          <div v-if="!(distribution.levelDist || []).length" class="empty">暂无数据</div>
          <table v-else class="data">
            <thead><tr><th>等级</th><th>数量</th></tr></thead>
            <tbody>
              <tr v-for="(d, i) in distribution.levelDist" :key="i"><td>{{ d.level }}</td><td class="mono">{{ d.count }}</td></tr>
            </tbody>
          </table>
        </section>
        <section class="card block">
          <h2>价格区间分布</h2>
          <div v-if="!(distribution.priceDist || []).length" class="empty">暂无数据</div>
          <table v-else class="data">
            <thead><tr><th>区间</th><th>数量</th></tr></thead>
            <tbody>
              <tr v-for="(d, i) in distribution.priceDist" :key="i"><td>{{ d.price_range }}</td><td class="mono">{{ d.count }}</td></tr>
            </tbody>
          </table>
        </section>
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
const dashboard = reactive({});
const trends = reactive({});
const distribution = reactive({});

async function load() {
  loading.value = true;
  try {
    const [d, t, dist] = await Promise.all([
      adminApi.getDashboard(),
      adminApi.getTrends(),
      adminApi.getDistribution(),
    ]);
    Object.assign(dashboard, d || {});
    Object.assign(trends, t || {});
    Object.assign(distribution, dist || {});
  } catch (e) {
    toast.error(e.message || '获取失败');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  margin-top: 20px;
}
.block {
  padding: 16px;
}
.block h2 {
  margin: 0 0 12px;
  font-size: 14px;
}
</style>
