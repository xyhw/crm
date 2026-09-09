<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">公告管理</h1>
      </div>
      <div class="row-actions">
        <button class="btn btn-ghost" type="button" @click="fetchList(page)">刷新</button>
        <button class="btn btn-primary" type="button" @click="openNew">新建公告</button>
      </div>
    </div>
    <div class="filter-bar">
      <input v-model="keyword" class="input filter-search" placeholder="搜索标题" @keyup.enter="search" />
      <button class="btn btn-primary" type="button" @click="search">搜索</button>
      <button class="btn btn-ghost" type="button" @click="clearSearch">清空</button>
      <div class="tabs">
        <button
          v-for="s in statusOptions"
          :key="s.value"
          class="tab"
          :class="{ active: extra.status === s.value }"
          type="button"
          @click="setFilter('status', s.value)"
        >{{ s.label }}</button>
      </div>
    </div>
    <StateView :loading="loading" :empty="!loading && list.length === 0" empty-title="暂无公告">
      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>标题</th>
              <th>形式</th>
              <th>排序</th>
              <th>置顶</th>
              <th>状态</th>
              <th>时间</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id">
              <td>{{ item.title }}</td>
              <td>{{ mediaTypeLabel(item.media_type) }}</td>
              <td>{{ item.sort_order }}</td>
              <td>{{ item.is_top ? '置顶' : '普通' }}</td>
              <td><span class="badge" :class="badgeTone(item.status)">{{ item.status === 'active' ? '启用' : '停用' }}</span></td>
              <td>{{ formatDate(item.created_at) }}</td>
              <td>
                <div class="row-actions">
                  <button class="btn btn-ghost" type="button" @click="openEdit(item)">编辑</button>
                  <button class="btn btn-ghost" type="button" @click="toggleStatus(item)">{{ item.status === 'active' ? '停用' : '启用' }}</button>
                  <button class="btn btn-danger-ghost" type="button" @click="askRemove(item)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination :page="page" :page-count="pageCount" :total="total" @change="goPage" />
    </StateView>

    <Modal v-model="editOpen" :title="editItem?.id ? '编辑公告' : '新建公告'" :dirty="formDirty" wide>
      <label class="field"><span class="field-label">标题<span class="required">*</span></span><input v-model="editForm.title" class="input" @input="formDirty = true" /></label>
      <label class="field"><span class="field-label">内容</span><textarea v-model="editForm.content" class="textarea" @input="formDirty = true" /></label>
      <label class="field">
        <span class="field-label">形式</span>
        <select v-model="editForm.media_type" class="select" @change="formDirty = true">
          <option v-for="o in mediaOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </label>
      <label class="field"><span class="field-label">媒体链接</span><input v-model="editForm.media_url" class="input" @input="formDirty = true" /></label>
      <label class="field"><span class="field-label">跳转链接</span><input v-model="editForm.link_url" class="input" @input="formDirty = true" /></label>
      <label class="field"><span class="field-label">生效时间</span><input v-model="editForm.start_at" class="input" placeholder="YYYY-MM-DD HH:mm:ss，可空" @input="formDirty = true" /></label>
      <label class="field"><span class="field-label">失效时间</span><input v-model="editForm.end_at" class="input" placeholder="YYYY-MM-DD HH:mm:ss，可空" @input="formDirty = true" /></label>
      <label class="field"><span class="field-label">排序</span><input v-model="editForm.sort_order" class="input" type="number" @input="formDirty = true" /></label>
      <label class="field check"><input v-model="editForm.is_top" type="checkbox" @change="formDirty = true" /><span>置顶</span></label>
      <template #footer>
        <button class="btn btn-primary" type="button" :disabled="saving" @click="save">{{ saving ? '保存中...' : '保存' }}</button>
      </template>
    </Modal>
    <ConfirmDialog
      v-model="confirmOpen"
      title="删除确认"
      :content="`确认删除公告「${confirmItem?.title}」？`"
      desc="删除后不可恢复"
      confirm-text="删除"
      tone="danger"
      @confirm="doRemove"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { adminApi } from '../api/client';
import { badgeTone, formatDate } from '../constants';
import { useList } from '../composables/useList';
import { useToastStore } from '../stores/toast';
import StateView from '../components/StateView.vue';
import Pagination from '../components/Pagination.vue';
import Modal from '../components/Modal.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';

const toast = useToastStore();
const {
  list, loading, total, page, pageCount, keyword, extra, fetchList, search, clearSearch, setFilter, goPage,
} = useList((params) => adminApi.getAnnouncements(params), { pageSize: 10 });

extra.value = { status: '' };
const statusOptions = [
  { label: '全部', value: '' },
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
];
const mediaOptions = [
  { label: '文字', value: 'text' },
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
  { label: '图文混合', value: 'mixed' },
];
const mediaTypeLabel = (v) => mediaOptions.find((x) => x.value === v)?.label || v || 'text';

const editOpen = ref(false);
const editItem = ref(null);
const editForm = ref({});
const formDirty = ref(false);
const saving = ref(false);
const confirmOpen = ref(false);
const confirmItem = ref(null);

function blankForm() {
  return {
    title: '', content: '', media_type: 'text', media_url: '', link_url: '',
    start_at: '', end_at: '', sort_order: 0, is_top: false,
  };
}
function openNew() {
  editItem.value = { id: null };
  editForm.value = blankForm();
  formDirty.value = false;
  editOpen.value = true;
}
function openEdit(item) {
  editItem.value = item;
  editForm.value = {
    title: item.title || '',
    content: item.content || '',
    media_type: item.media_type || 'text',
    media_url: item.media_url || '',
    link_url: item.link_url || '',
    start_at: item.start_at || '',
    end_at: item.end_at || '',
    sort_order: item.sort_order || 0,
    is_top: !!item.is_top,
  };
  formDirty.value = false;
  editOpen.value = true;
}

async function save() {
  if (!editForm.value.title?.trim()) { toast.error('标题不能为空'); return; }
  saving.value = true;
  try {
    const body = {
      ...editForm.value,
      is_top: editForm.value.is_top ? 1 : 0,
      sort_order: Number(editForm.value.sort_order) || 0,
    };
    if (editItem.value.id) await adminApi.updateAnnouncement(editItem.value.id, body);
    else await adminApi.createAnnouncement(body);
    toast.success('保存成功');
    formDirty.value = false;
    editOpen.value = false;
    fetchList(page.value);
  } catch (e) {
    toast.error(e.message);
  } finally {
    saving.value = false;
  }
}
async function toggleStatus(item) {
  try {
    await adminApi.updateAnnouncement(item.id, { status: item.status === 'active' ? 'inactive' : 'active' });
    toast.success('状态已更新');
    fetchList(page.value);
  } catch (e) {
    toast.error(e.message);
  }
}
function askRemove(item) {
  confirmItem.value = item;
  confirmOpen.value = true;
}
async function doRemove() {
  try {
    await adminApi.deleteAnnouncement(confirmItem.value.id);
    toast.success('已删除');
    fetchList(page.value);
  } catch (e) {
    toast.error(e.message);
  }
}

onMounted(() => fetchList(1));
</script>

<style scoped>
.check { flex-direction: row; align-items: center; gap: 8px; }
</style>
