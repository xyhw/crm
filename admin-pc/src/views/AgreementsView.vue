<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">协议内容</h1>
        <p class="page-sub">用户协议、隐私政策等结构化文案</p>
      </div>
      <button class="btn btn-ghost" type="button" @click="fetchData">刷新</button>
    </div>
    <div class="card table-wrap">
      <table class="data">
        <thead>
          <tr><th>类型</th><th>标题</th><th>章节</th><th>状态</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.key">
            <td>{{ row.label }}</td>
            <td>{{ row.title }}</td>
            <td>{{ row.sectionCount }}</td>
            <td><span class="badge" :class="row.configured ? 'badge-ok' : 'badge-muted'">{{ row.configured ? '已配置' : '未配置' }}</span></td>
            <td><button class="btn btn-ghost" type="button" @click="openEdit(row)">编辑</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal v-model="editOpen" :title="editing ? `编辑 ${editing.label}` : '编辑协议'" :dirty="formDirty" wide>
      <label class="field">
        <span class="field-label">标题<span class="required">*</span></span>
        <input v-model="editForm.title" class="input" @input="formDirty = true" />
      </label>
      <div v-for="(s, i) in editForm.sections" :key="i" class="sec">
        <div class="sec-head">
          <span>章节 {{ i + 1 }}</span>
          <button class="btn btn-danger-ghost" type="button" @click="removeSection(i)">移除</button>
        </div>
        <input v-model="s.h" class="input" placeholder="小标题" @input="formDirty = true" />
        <textarea v-model="s.p" class="textarea" placeholder="正文" @input="formDirty = true" />
      </div>
      <button class="btn btn-ghost" type="button" @click="addSection">新增章节</button>
      <template #footer>
        <button class="btn btn-primary" type="button" @click="save">保存</button>
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
const AGREEMENT_TYPES = [
  { key: 'agreement', label: '用户协议' },
  { key: 'privacy', label: '隐私政策' },
  { key: 'summary', label: '平台须知' },
  { key: 'disclaimer', label: '免责声明' },
  { key: 'service', label: '服务条款' },
  { key: 'refund', label: '退款说明' },
  { key: 'complaint', label: '投诉渠道' },
];

const rows = ref([]);
const editOpen = ref(false);
const editing = ref(null);
const editForm = ref({ title: '', sections: [] });
const formDirty = ref(false);

function parseAgreement(raw) {
  if (typeof raw !== 'string') return raw;
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
  } catch {
    return raw;
  }
  return raw;
}

async function fetchData() {
  try {
    const res = await adminApi.getConfigs();
    rows.value = AGREEMENT_TYPES.map(({ key, label }) => {
      const raw = res[`agreement_${key}`];
      const content = parseAgreement(raw);
      const sections = Array.isArray(content?.sections)
        ? content.sections
        : typeof content === 'object' && content !== null
          ? []
          : [];
      return {
        key,
        label,
        title: content?.title || label,
        sectionCount: sections.length,
        configured: !!raw,
      };
    });
  } catch (e) {
    toast.error(e.message);
  }
}

async function openEdit(row) {
  try {
    const res = await adminApi.getConfigs();
    const raw = res[`agreement_${row.key}`];
    let content = { title: row.label, sections: [] };
    const parsed = parseAgreement(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      content = {
        title: parsed.title || row.label,
        sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      };
    }
    editing.value = row;
    editForm.value = {
      title: content.title,
      sections: content.sections.map((s) => ({ h: s.h || '', p: s.p || '' })),
    };
    formDirty.value = false;
    editOpen.value = true;
  } catch (e) {
    toast.error(e.message);
  }
}

function addSection() {
  editForm.value.sections.push({ h: '', p: '' });
  formDirty.value = true;
}
function removeSection(i) {
  editForm.value.sections.splice(i, 1);
  formDirty.value = true;
}

async function save() {
  if (!editForm.value.title?.trim()) {
    toast.error('请输入协议标题');
    return;
  }
  for (let i = 0; i < editForm.value.sections.length; i += 1) {
    const s = editForm.value.sections[i];
    if (!s.h?.trim()) { toast.error(`请输入第${i + 1}个章节的小标题`); return; }
    if (!s.p?.trim()) { toast.error(`请输入第${i + 1}个章节的正文`); return; }
  }
  try {
    await adminApi.updateConfig({
      [`agreement_${editing.value.key}`]: {
        title: editForm.value.title,
        sections: editForm.value.sections.map((s) => ({ h: s.h, p: s.p })),
      },
    });
    toast.success('协议已保存');
    formDirty.value = false;
    editOpen.value = false;
    fetchData();
  } catch (e) {
    toast.error(e.message);
  }
}

onMounted(fetchData);
</script>

<style scoped>
.sec { background: #f8fafc; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.sec-head { display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 13px; }
</style>
