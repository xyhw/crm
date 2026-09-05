<template>
  <Teleport to="body">
    <div v-if="modelValue" class="mask" @click="onCancel">
      <div class="box" role="dialog" aria-modal="true" @click.stop>
        <h3 class="title">{{ title }}</h3>
        <p class="content">{{ content }}</p>
        <p v-if="desc" class="desc">{{ desc }}</p>
        <div class="actions">
          <button class="btn btn-ghost" type="button" @click="onCancel">取消</button>
          <button
            class="btn"
            :class="tone === 'danger' || tone === 'warning' ? 'btn-danger' : 'btn-primary'"
            type="button"
            @click="onConfirm"
          >{{ confirmText }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  modelValue: Boolean,
  title: { type: String, default: '确认' },
  content: { type: String, default: '' },
  desc: { type: String, default: '' },
  confirmText: { type: String, default: '确定' },
  tone: { type: String, default: 'primary' },
});
const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

function onCancel() {
  emit('update:modelValue', false);
  emit('cancel');
}
function onConfirm() {
  emit('update:modelValue', false);
  emit('confirm');
}
</script>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.box {
  width: 420px;
  max-width: calc(100vw - 32px);
  background: #fff;
  border-radius: 12px;
  padding: 22px 22px 18px;
  box-shadow: var(--shadow-md);
}
.title {
  margin: 0 0 8px;
  font-size: 16px;
}
.content {
  margin: 0;
  color: var(--color-secondary);
}
.desc {
  margin: 8px 0 0;
  color: var(--color-muted-fg);
  font-size: 12px;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}
</style>
