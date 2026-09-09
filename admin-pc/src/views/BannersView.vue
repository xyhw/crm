<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">Banner 管理</h1>
      </div>
      <div class="row-actions">
        <button class="btn btn-ghost" type="button" @click="fetchList(page)">刷新</button>
        <button class="btn btn-primary" type="button" @click="openNew">新建 Banner</button>
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
    <StateView :loading="loading" :empty="!loading && list.length === 0" empty-title="暂无 Banner">
      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>预览</th>
              <th>标题</th>
              <th>链接</th>
              <th>排序</th>
              <th>状态</th>
              <th>时间</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id">
              <td><img v-if="item.image_url" :src="item.image_url" alt="" class="thumb" /></td>
              <td>{{ item.title }}</td>
              <td>{{ item.link_url || '-' }}</td>
              <td>{{ item.sort_order }}</td>
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

    <Modal v-model="editOpen" :title="editItem?.id ? '编辑 Banner' : '新建 Banner'" :dirty="formDirty">
      <label class="field"><span class="field-label">标题<span class="required">*</span></span><input v-model="editForm.title" class="input" @input="formDirty = true" /></label>
      <label class="field"><span class="field-label">图片URL<span class="required">*</span></span><input v-model="editForm.image_url" class="input" @input="formDirty = true" /></label>
      <img v-if="editForm.image_url" :src="editForm.image_url" alt="" class="preview" />
      <label class="field"><span class="field-label">链接</span><input v-model="editForm.link_url" class="input" @input="formDirty = true" /></label>
      <label class="field"><span class="field-label">排序</span><input v-model="editForm.sort_order" class="input" type="number" @input="formDirty = true" /></label>
      <label class="field">
        <span class="field-label">状态</span>
        <select v-model="editForm.status" class="select" @change="formDirty = true">
          <option value="active">启用</option>
          <option value="inactive">停用</option>
        </select>
      </label>
      <label class="field"><span class="field-label">生效时间</span><input v-model="editForm.start_at" class="input" placeholder="YYYY-MM-DD HH:mm:ss，可空" @input="formDirty = true" /></label>
      <label class="field"><span class="field-label">失效时间</span><input v-model="editForm.end_at" class="input" placeholder="YYYY-MM-DD HH:mm:ss，可空" @input="formDirty = true" /></label>
      <template #footer>
        <button class="btn btn-primary" type="button" :disabled="saving" @click="save">{{ saving ? '保存中...' : '保存' }}</button>
      </template>
    </Modal>
    <ConfirmDialog
      v-model="confirmOpen"
      title="删除确认"
      :content="`确认删除 Banner「${confirmItem?.title}」？`"
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
} = useList((params) => adminApi.getBanners(params), { pageSize: 10 });

extra.value = { status: '' };
const statusOptions = [
  { label: '全部', value: '' },
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
];

const editOpen = ref(false);
const editItem = ref(null);
const editForm = ref({});
const formDirty = ref(false);
const saving = ref(false);
const confirmOpen = ref(false);
const confirmItem = ref(null);

function openNew() {
  editItem.value = { id: null };
  editForm.value = { title: '', image_url: '', link_url: '', sort_order: 0, status: 'active', start_at: '', end_at: '' };
  formDirty.value = false;
  editOpen.value = true;
}
function openEdit(item) {
  editItem.value = item;
  editForm.value = {
    title: item.title || '',
    image_url: item.image_url || '',
    link_url: item.link_url || '',
    sort_order: item.sort_order || 0,
    status: item.status || 'active',
    start_at: item.start_at || '',
    end_at: item.end_at || '',
  };
  formDirty.value = false;
  editOpen.value = true;
}

async function save() {
  if (!editForm.value.title?.trim()) { toast.error('标题不能为空'); return; }
  if (!editForm.value.image_url?.trim()) { toast.error('图片URL不能为空'); return; }
  saving.value = true;
  try {
    const body = { ...editForm.value, sort_order: Number(editForm.value.sort_order) || 0 };
    if (editItem.value.id) await adminApi.updateBanner(editItem.value.id, body);
    else await adminApi.createBanner(body);
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
    await adminApi.updateBanner(item.id, { status: item.status === 'active' ? 'inactive' : 'active' });
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
    await adminApi.deleteBanner(confirmItem.value.id);
    toast.success('已删除');
    fetchList(page.value);
  } catch (e) {
    toast.error(e.message);
  }
}

onMounted(() => fetchList(1));
</script>

<style scoped>
.thumb { width: 72px; height: 40px; object-fit: cover; border-radius: 6px; }
.preview { width: 100%; max-height: 160px; object-fit: cover; border-radius: 8px; }
</style>
