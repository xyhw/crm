<template>
  <div v-if="total > 0" class="pager">
    <span class="meta">共 {{ total }} 条</span>
    <button class="btn btn-ghost" type="button" :disabled="page <= 1" @click="$emit('change', page - 1)">上一页</button>
    <span class="cur">{{ page }} / {{ pageCount }}</span>
    <button class="btn btn-ghost" type="button" :disabled="page >= pageCount" @click="$emit('change', page + 1)">下一页</button>
  </div>
</template>

<script setup>
defineProps({
  page: { type: Number, default: 1 },
  pageCount: { type: Number, default: 1 },
  total: { type: Number, default: 0 },
});
defineEmits(['change']);
</script>

<style scoped>
.pager {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 0 0;
}
.meta,
.cur {
  font-size: 12px;
  color: var(--color-muted-fg);
}
</style>
