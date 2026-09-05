<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">等级配置</h1>
        <p class="page-sub">会员折扣与晋升阈值</p>
      </div>
      <button class="btn btn-ghost" type="button" @click="fetchList">刷新</button>
    </div>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else class="card table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>等级</th>
            <th>购买折扣</th>
            <th>佣金加成</th>
            <th>购买率</th>
            <th>失效率</th>
            <th>有用率</th>
            <th>活跃度</th>
            <th>标记权重</th>
            <th>免审</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>{{ item.name || item.level_key }}</td>
            <td>{{ pct(item.purchase_discount) }}</td>
            <td>+{{ pct(item.commission_bonus) }}</td>
            <td>{{ item.purchase_rate_threshold }}%</td>
            <td>{{ item.invalid_rate_threshold }}%</td>
            <td>{{ item.helpful_rate_threshold }}%</td>
            <td>{{ item.activity_threshold }}</td>
            <td>{{ item.mark_weight }}</td>
            <td>{{ item.free_audit ? '是' : '否' }}</td>
            <td><button class="btn btn-ghost" type="button" @click="openEdit(item)">编辑</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal v-model="editOpen" :title="editItem?.name || editItem?.level_key || '编辑等级'" :dirty="formDirty">
      <label class="field"><span class="field-label">购买折扣(0.9=9折)</span><input v-model="editForm.purchase_discount" class="input" @input="formDirty = true" /><span class="field-help">建议 0.8-0.95</span></label>
      <label class="field"><span class="field-label">分佣加成(0.1=10%)</span><input v-model="editForm.commission_bonus" class="input" @input="formDirty = true" /></label>
      <label class="field"><span class="field-label">购买率阈值(%)</span><input v-model="editForm.purchase_rate_threshold" class="input" @input="formDirty = true" /></label>
      <label class="field"><span class="field-label">失效率阈值(%)</span><input v-model="editForm.invalid_rate_threshold" class="input" @input="formDirty = true" /></label>
      <label class="field"><span class="field-label">有用率阈值(%)</span><input v-model="editForm.helpful_rate_threshold" class="input" @input="formDirty = true" /></label>
      <label class="field"><span class="field-label">活跃度阈值</span><input v-model="editForm.activity_threshold" class="input" @input="formDirty = true" /></label>
      <label class="field"><span class="field-label">无效标记权重</span><input v-model="editForm.mark_weight" class="input" @input="formDirty = true" /><span class="field-help">取值 1-3</span></label>
      <label class="field check">
        <input v-model="editForm.free_audit" type="checkbox" @change="formDirty = true" />
        <span>进展同步免审</span>
      </label>
      <template #footer>
        <button class="btn btn-primary" type="button" :disabled="saving" @click="submitEdit">{{ saving ? '保存中...' : '保存' }}</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { adminApi } from '../api/client';
import { useToastStore } from '../stores/toast';
import Modal from '../components/Modal.vue';

const toast = useToastStore();
const list = ref([]);
const loading = ref(false);
const editOpen = ref(false);
const editItem = ref(null);
const editForm = ref({});
const saving = ref(false);
const formDirty = ref(false);

function pct(v) {
  const n = Number(v);
  return Number.isNaN(n) ? '0%' : `${Math.round((n || 0) * 100)}%`;
}

async function fetchList() {
  loading.value = true;
  try {
    list.value = await adminApi.getLevels();
  } catch (e) {
    toast.error(e.message);
  } finally {
    loading.value = false;
  }
}

function openEdit(item) {
  editItem.value = item;
  editForm.value = {
    purchase_discount: String(item.purchase_discount ?? ''),
    commission_bonus: String(item.commission_bonus ?? ''),
    purchase_rate_threshold: String(item.purchase_rate_threshold ?? ''),
    invalid_rate_threshold: String(item.invalid_rate_threshold ?? ''),
    helpful_rate_threshold: String(item.helpful_rate_threshold ?? ''),
    activity_threshold: String(item.activity_threshold ?? ''),
    mark_weight: String(item.mark_weight ?? ''),
    free_audit: !!item.free_audit,
  };
  formDirty.value = false;
  editOpen.value = true;
}

async function submitEdit() {
  const num = (v, d = 0) => {
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
  };
  const checks = [
    ['购买折扣', num(editForm.value.purchase_discount), 0, 1],
    ['分佣加成', num(editForm.value.commission_bonus), 0, 1],
    ['购买率阈值', num(editForm.value.purchase_rate_threshold), 0, 100],
    ['失效率阈值', num(editForm.value.invalid_rate_threshold), 0, 100],
    ['有用率阈值', num(editForm.value.helpful_rate_threshold), 0, 100],
    ['活跃度阈值', num(editForm.value.activity_threshold), 0, null],
    ['无效标记权重', num(editForm.value.mark_weight), 1, 3],
  ];
  for (const [label, v, min, max] of checks) {
    if (Number.isNaN(v)) { toast.error(`${label}格式不正确`); return; }
    if (min !== null && v < min) { toast.error(`${label}不能小于${min}`); return; }
    if (max !== null && v > max) { toast.error(`${label}不能大于${max}`); return; }
  }
  saving.value = true;
  try {
    await adminApi.updateLevel(editItem.value.id, {
      purchase_discount: num(editForm.value.purchase_discount),
      commission_bonus: num(editForm.value.commission_bonus),
      purchase_rate_threshold: num(editForm.value.purchase_rate_threshold),
      invalid_rate_threshold: num(editForm.value.invalid_rate_threshold),
      helpful_rate_threshold: num(editForm.value.helpful_rate_threshold),
      activity_threshold: num(editForm.value.activity_threshold),
      mark_weight: num(editForm.value.mark_weight),
      free_audit: editForm.value.free_audit ? 1 : 0,
    });
    toast.success('保存成功');
    formDirty.value = false;
    editOpen.value = false;
    fetchList();
  } catch (e) {
    toast.error(e.message);
  } finally {
    saving.value = false;
  }
}

onMounted(fetchList);
</script>

<style scoped>
.check { flex-direction: row; align-items: center; gap: 8px; }
</style>
