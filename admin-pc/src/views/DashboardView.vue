<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">仪表盘</h1>
        <p class="page-sub">平台核心指标一览</p>
      </div>
      <button class="btn btn-ghost" type="button" @click="load">刷新</button>
    </div>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else class="stat-grid">
      <div v-for="card in cards" :key="card.title" class="card stat-card">
        <div class="stat-label">{{ card.title }}</div>
        <div class="stat-value">{{ card.value }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { adminApi } from '../api/client';
import { useToastStore } from '../stores/toast';

const toast = useToastStore();
const loading = ref(true);
const stats = ref({});

const cards = computed(() => [
  { title: '用户总数', value: stats.value.totalUsers ?? 0 },
  { title: '在架商机', value: stats.value.totalOpportunities ?? 0 },
  { title: '已支付订单', value: stats.value.totalOrders ?? 0 },
  { title: '积分存量', value: Number(stats.value.totalPoints ?? 0) },
  { title: '今日订单', value: stats.value.todayOrders ?? 0 },
  { title: '今日收入(积分)', value: stats.value.todayRevenue ?? 0 },
]);

async function load() {
  loading.value = true;
  try {
    stats.value = await adminApi.getDashboard();
  } catch (e) {
    toast.error(e.message || '获取失败');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
