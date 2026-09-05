<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">批量导入</h1>
        <p class="page-sub">CSV 导入商机</p>
      </div>
    </div>
    <div class="card tip">
      支持 CSV 格式（标题,分类ID,城市,酒店名称,阶段,价格,公开描述,详细描述,联系人,联系电话），标题为必填。
    </div>
    <label class="btn btn-primary upload">
      {{ uploading ? '导入中...' : '选择 CSV 文件' }}
      <input type="file" accept=".csv,text/csv" :disabled="uploading" @change="onFile" />
    </label>
    <div v-if="lastResult" class="card result">
      <div>成功：{{ lastResult.successCount }} 条 | 失败：{{ lastResult.errorCount }} 条</div>
      <div v-for="(err, i) in lastResult.errors || []" :key="i" class="err">{{ err }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { adminApi } from '../api/client';
import { useToastStore } from '../stores/toast';

const toast = useToastStore();
const uploading = ref(false);
const lastResult = ref(null);

async function onFile(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file || uploading.value) return;
  uploading.value = true;
  try {
    lastResult.value = await adminApi.importOpportunities(file);
    toast.success('导入完成');
  } catch (err) {
    toast.error(err.message || '导入失败');
  } finally {
    uploading.value = false;
  }
}
</script>

<style scoped>
.tip {
  padding: 16px;
  margin-bottom: 16px;
  color: var(--color-secondary);
}
.upload {
  position: relative;
  overflow: hidden;
}
.upload input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.result {
  margin-top: 16px;
  padding: 16px;
}
.err {
  color: var(--color-destructive);
  font-size: 12px;
  margin-top: 6px;
}
</style>
