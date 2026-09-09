<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">分类管理</h1>
      </div>
      <div class="row-actions">
        <button class="btn btn-ghost" type="button" @click="fetchList()">刷新</button>
        <button class="btn btn-primary" type="button" @click="openNew">新建分类</button>
      </div>
    </div>
    <div class="filter-bar">
      <input v-model="keyword" class="input filter-search" placeholder="搜索分类名称" @keyup.enter="search" />
      <button class="btn btn-primary" type="button" @click="search">搜索</button>
      <button class="btn btn-ghost" type="button" @click="clearSearch">清空</button>
    </div>
    <StateView :loading="loading" :empty="!loading && list.length === 0" empty-title="暂无分类">
      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>ID</th>
              <th>名称</th>
              <th>图标</th>
              <th>排序</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id">
              <td>{{ item.id }}</td>
              <td>{{ item.name }}</td>
              <td><img v-if="item.icon" :src="item.icon" alt="" class="icon" /></td>
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
    </StateView>

    <Modal v-model="editOpen" :title="editItem?.id ? '编辑分类' : '新建分类'" :dirty="formDirty">
      <label class="field"><span class="field-label">名称<span class="required">*</span></span><input v-model="editForm.name" class="input" @input="formDirty = true" /></label>
      <label class="field"><span class="field-label">图标URL</span><input v-model="editForm.icon" class="input" @input="formDirty = true" /></label>
      <label class="field"><span class="field-label">排序</span><input v-model="editForm.sort_order" class="input" type="number" @input="formDirty = true" /></label>
      <template #footer>
        <button class="btn btn-primary" type="button" :disabled="saving" @click="save">{{ saving ? '保存中...' : '保存' }}</button>
      </template>
    </Modal>
    <ConfirmDialog
      v-model="confirmOpen"
      title="删除确认"
      :content="`确认删除分类「${confirmItem?.name}」？`"
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
import Modal from '../components/Modal.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';

const toast = useToastStore();
const {
  list, loading, keyword, fetchList, search, clearSearch,
} = useList((params) => adminApi.getCategories(params), { pageSize: 50 });

const editOpen = ref(false);
const editItem = ref(null);
const editForm = ref({});
const formDirty = ref(false);
const saving = ref(false);
const confirmOpen = ref(false);
const confirmItem = ref(null);

function openNew() {
  editItem.value = { id: null };
  editForm.value = { name: '', icon: '', sort_order: 0 };
  formDirty.value = false;
  editOpen.value = true;
}
function openEdit(item) {
  editItem.value = item;
  editForm.value = { name: item.name || '', icon: item.icon || '', sort_order: item.sort_order || 0 };
  formDirty.value = false;
  editOpen.value = true;
}
async function save() {
  if (!editForm.value.name?.trim()) { toast.error('名称不能为空'); return; }
  saving.value = true;
  try {
    const body = { ...editForm.value, sort_order: Number(editForm.value.sort_order) || 0 };
    if (editItem.value.id) await adminApi.updateCategory(editItem.value.id, body);
    else await adminApi.createCategory(body);
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
function askRemove(item) {
  confirmItem.value = item;
  confirmOpen.value = true;
}
async function doRemove() {
  try {
    await adminApi.deleteCategory(confirmItem.value.id);
    toast.success('已删除');
    fetchList();
  } catch (e) {
    toast.error(e.message);
  }
}

onMounted(() => fetchList());
</script>

<style scoped>
.icon { width: 28px; height: 28px; object-fit: cover; border-radius: 6px; }
</style>
