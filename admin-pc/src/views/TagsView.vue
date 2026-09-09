<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">标签管理</h1>
      </div>
      <div class="row-actions">
        <button class="btn btn-ghost" type="button" @click="fetchList(page)">刷新</button>
        <button class="btn btn-primary" type="button" @click="openNew">新建标签</button>
      </div>
    </div>
    <div class="filter-bar">
      <input v-model="keyword" class="input filter-search" placeholder="搜索标签名称" @keyup.enter="search" />
      <button class="btn btn-primary" type="button" @click="search">搜索</button>
      <button class="btn btn-ghost" type="button" @click="clearSearch">清空</button>
    </div>
    <StateView :loading="loading" :empty="!loading && list.length === 0" empty-title="暂无标签">
      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>ID</th>
              <th>名称</th>
              <th>排序</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id">
              <td>{{ item.id }}</td>
              <td>{{ item.name }}</td>
              <td>{{ item.sort_order }}</td>
              <td>
                <div class="row-actions">
                  <button class="btn btn-ghost" type="button" @click="openEdit(item)">编辑</button>
                  <button class="btn btn-danger-ghost" type="button" @click="askRemove(item)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination :page="page" :page-count="pageCount" :total="total" @change="goPage" />
    </StateView>

    <Modal v-model="editOpen" :title="editItem?.id ? '编辑标签' : '新建标签'" :dirty="formDirty">
      <label class="field"><span class="field-label">名称<span class="required">*</span></span><input v-model="editForm.name" class="input" @input="formDirty = true" /></label>
      <label class="field"><span class="field-label">排序</span><input v-model="editForm.sort_order" class="input" type="number" @input="formDirty = true" /></label>
      <template #footer>
        <button class="btn btn-primary" type="button" @click="save">保存</button>
      </template>
    </Modal>
    <ConfirmDialog
      v-model="confirmOpen"
      title="删除确认"
      :content="`确认删除标签「${confirmItem?.name}」？`"
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
import { useList } from '../composables/useList';
import { useToastStore } from '../stores/toast';
import StateView from '../components/StateView.vue';
import Pagination from '../components/Pagination.vue';
import Modal from '../components/Modal.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';

const toast = useToastStore();
const {
  list, loading, total, page, pageCount, keyword, fetchList, search, clearSearch, goPage,
} = useList((params) => adminApi.getTags(params), { pageSize: 20 });

const editOpen = ref(false);
const editItem = ref(null);
const editForm = ref({});
const formDirty = ref(false);
const confirmOpen = ref(false);
const confirmItem = ref(null);

function openNew() {
  editItem.value = { id: null };
  editForm.value = { name: '', sort_order: 0 };
  formDirty.value = false;
  editOpen.value = true;
}
function openEdit(item) {
  editItem.value = item;
  editForm.value = { name: item.name || '', sort_order: item.sort_order || 0 };
  formDirty.value = false;
  editOpen.value = true;
}
async function save() {
  if (!editForm.value.name?.trim()) { toast.error('名称不能为空'); return; }
  try {
    const body = { ...editForm.value, sort_order: Number(editForm.value.sort_order) || 0 };
    if (editItem.value.id) await adminApi.updateTag(editItem.value.id, body);
    else await adminApi.createTag(body);
    toast.success('保存成功');
    formDirty.value = false;
    editOpen.value = false;
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
    await adminApi.deleteTag(confirmItem.value.id);
    toast.success('已删除');
    fetchList(page.value);
  } catch (e) {
    toast.error(e.message);
  }
}

onMounted(() => fetchList(1));
</script>
