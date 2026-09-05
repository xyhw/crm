<template>
  <div>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="empty" class="empty">
      <div>{{ emptyTitle }}</div>
      <div v-if="emptyDesc" class="field-help">{{ emptyDesc }}</div>
    </div>
    <slot v-else />
  </div>
</template>

<script setup>
defineProps({
  loading: Boolean,
  empty: Boolean,
  emptyTitle: { type: String, default: '暂无数据' },
  emptyDesc: { type: String, default: '' },
});
</script>
