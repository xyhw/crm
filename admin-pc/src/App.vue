<template>
  <router-view />
  <div class="toast-stack" aria-live="polite">
    <div v-for="t in toast.items" :key="t.id" class="toast" :class="'toast-' + t.type">
      {{ t.message }}
    </div>
  </div>
</template>

<script setup>
import { useToastStore } from './stores/toast';

const toast = useToastStore();
</script>

<style scoped>
.toast-stack {
  position: fixed;
  right: 20px;
  top: 20px;
  z-index: 80;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.toast {
  min-width: 220px;
  max-width: 360px;
  padding: 10px 14px;
  border-radius: 8px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  box-shadow: var(--shadow-md);
}
.toast-info { background: var(--color-primary); }
.toast-success { background: var(--color-success); }
.toast-error { background: var(--color-destructive); }
</style>
