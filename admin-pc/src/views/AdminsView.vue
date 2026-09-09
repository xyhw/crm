<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">管理员</h1>
        <p class="page-sub">账号启停与资料维护</p>
      </div>
      <div class="row-actions">
        <button class="btn btn-ghost" type="button" @click="fetchList(page)">刷新</button>
        <button class="btn btn-primary" type="button" @click="openNew">新建管理员</button>
      </div>
    </div>
    <div class="filter-bar">
      <input v-model="keyword" class="input filter-search" placeholder="搜索用户名/姓名/手机号" @keyup.enter="search" />
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
    <StateView :loading="loading" :empty="!loading && list.length === 0" empty-title="暂无管理员">
      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>姓名</th>
              <th>用户名</th>
              <th>手机</th>
              <th>状态</th>
              <th>创建时间</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id">
              <td>{{ item.name || item.username }}</td>
              <td>{{ item.username }}</td>
              <td>{{ item.phone || '-' }}</td>
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

    <Modal v-model="editOpen" :title="editItem?.id ? '编辑管理员' : '新建管理员'" :dirty="formDirty">
      <label v-if="!editItem?.id" class="field">
        <span class="field-label">用户名<span class="required">*</span></span>
        <input v-model="editForm.username" class="input" @input="formDirty = true" />
      </label>
      <label v-if="!editItem?.id" class="field">
        <span class="field-label">密码<span class="required">*</span></span>
        <input v-model="editForm.password" class="input" type="password" @input="formDirty = true" />
      </label>
      <label v-else class="field">
        <span class="field-label">新密码（留空不改）</span>
        <input v-model="editForm.password" class="input" type="password" placeholder="留空则不修改" @input="formDirty = true" />
      </label>
      <label class="field">
        <span class="field-label">姓名<span class="required">*</span></span>
        <input v-model="editForm.name" class="input" @input="formDirty = true" />
      </label>
      <label class="field">
        <span class="field-label">手机号</span>
        <input v-model="editForm.phone" class="input" @input="formDirty = true" />
      </label>
      <template #footer>
        <button class="btn btn-primary" type="button" :disabled="saving" @click="save">{{ saving ? '保存中...' : '保存' }}</button>
      </template>
    </Modal>

    <ConfirmDialog
      v-model="confirmOpen"
      title="删除确认"
      :content="`确认删除管理员「${confirmItem?.username}」？`"
      desc="删除后不可恢复"
      confirm-text="删除"
      tone="danger"
      @confirm="doRemove"
    />
    <ConfirmDialog
      v-model="pwdOpen"
      title="修改密码确认"
      content="确认修改该管理员密码？"
      confirm-text="确认改密"
      tone="warning"
      @confirm="doSave"
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
} = useList((params) => adminApi.getAdmins(params), { pageSize: 10 });

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
const pwdOpen = ref(false);

function openNew() {
  editItem.value = { id: null };
  editForm.value = { username: '', password: '', name: '', phone: '' };
  formDirty.value = false;
  editOpen.value = true;
}
function openEdit(item) {
  editItem.value = item;
  editForm.value = { name: item.name || '', phone: item.phone || '', password: '' };
  formDirty.value = false;
  editOpen.value = true;
}

function save() {
  if (!editForm.value.name?.trim()) {
    toast.error('姓名不能为空');
    return;
  }
  if (!editItem.value.id && (!editForm.value.username || !editForm.value.password)) {
    toast.error('请填写用户名和密码');
    return;
  }
  if (editItem.value.id && editForm.value.password) {
    pwdOpen.value = true;
    return;
  }
  doSave();
}

async function doSave() {
  saving.value = true;
  try {
    if (editItem.value.id) {
      const body = { name: editForm.value.name, phone: editForm.value.phone };
      if (editForm.value.password) body.password = editForm.value.password;
      await adminApi.updateAdmin(editItem.value.id, body);
    } else {
      await adminApi.createAdmin({
        username: editForm.value.username,
        password: editForm.value.password,
        name: editForm.value.name,
        phone: editForm.value.phone,
      });
    }
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
    await adminApi.updateAdmin(item.id, { status: item.status === 'active' ? 'inactive' : 'active' });
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
    await adminApi.deleteAdmin(confirmItem.value.id);
    toast.success('已删除');
    fetchList(page.value);
  } catch (e) {
    toast.error(e.message);
  }
}

onMounted(() => fetchList(1));
</script>
