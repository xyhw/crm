<template>
  <Teleport to="body">
    <div v-if="modelValue" class="mask" @click="tryClose">
      <div class="box" :class="{ wide }" role="dialog" aria-modal="true" @click.stop>
        <div class="head">
          <h3>{{ title }}</h3>
          <button class="close" type="button" aria-label="关闭" @click="tryClose">×</button>
        </div>
        <div class="body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="foot">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  modelValue: Boolean,
  title: { type: String, default: '' },
  dirty: { type: Boolean, default: false },
  wide: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);

function tryClose() {
  if (props.dirty && !window.confirm('表单有未保存的修改，确认关闭？')) return;
  emit('update:modelValue', false);
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
  z-index: 40;
  padding: 24px;
}
.box {
  width: 520px;
  max-width: 100%;
  max-height: calc(100vh - 48px);
  overflow: auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: var(--shadow-md);
}
.box.wide {
  width: 720px;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}
.head h3 {
  margin: 0;
  font-size: 16px;
}
.close {
  border: 0;
  background: transparent;
  font-size: 22px;
  color: #94a3b8;
  width: 32px;
  height: 32px;
}
.body {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.foot {
  padding: 12px 20px 18px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
