<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">角色权限</h1>
        <p class="page-sub">角色与管理员角色绑定</p>
      </div>
      <div class="row-actions">
        <button class="btn btn-ghost" type="button" @click="fetchData">刷新</button>
        <button class="btn btn-primary" type="button" @click="openNewRole">新建角色</button>
      </div>
    </div>

    <div class="card table-wrap">
      <table class="data">
        <thead>
          <tr><th>角色</th><th>描述</th><th>权限</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="r in roles" :key="r.id">
            <td>{{ r.name }}</td>
            <td>{{ r.description || '-' }}</td>
            <td>{{ (r.permissions || []).length }}</td>
            <td>
              <div class="row-actions">
                <button class="btn btn-ghost" type="button" @click="openEditRole(r)">编辑</button>
                <button class="btn btn-danger-ghost" type="button" @click="askRemoveRole(r)">删除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="page-head" style="margin-top: 28px;">
      <h2 class="page-title" style="font-size: 18px;">管理员角色</h2>
      <button class="btn btn-primary" type="button" @click="openNewAdmin">绑定管理员</button>
    </div>
    <div class="card table-wrap">
      <table class="data">
        <thead>
          <tr><th>姓名</th><th>用户名</th><th>手机</th><th>角色</th><th>状态</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="a in admins" :key="a.id">
            <td>{{ a.name || a.username }}</td>
            <td>{{ a.username }}</td>
            <td>{{ a.phone || '-' }}</td>
            <td>{{ (a.roles || []).map((r) => r.name).join('、') || '-' }}</td>
            <td><span class="badge" :class="badgeTone(a.status)">{{ a.status === 'active' ? '正常' : '禁用' }}</span></td>
            <td>
              <div class="row-actions">
                <button class="btn btn-ghost" type="button" @click="openEditAdmin(a)">编辑</button>
                <button class="btn btn-ghost" type="button" @click="toggleAdmin(a)">{{ a.status === 'active' ? '禁用' : '启用' }}</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal v-model="roleOpen" :title="roleForm.id ? '编辑角色' : '新建角色'" :dirty="formDirty" wide>
      <label class="field"><span class="field-label">角色名<span class="required">*</span></span><input v-model="roleForm.name" class="input" @input="formDirty = true" /></label>
      <label class="field"><span class="field-label">描述</span><input v-model="roleForm.description" class="input" @input="formDirty = true" /></label>
      <div v-for="(perms, group) in permGroups" :key="group" class="perm-g">
        <div class="field-label">{{ group }}</div>
        <div class="chips">
          <button
            v-for="p in perms"
            :key="p.key"
            class="tab"
            :class="{ active: roleForm.permissions.includes(p.key) }"
            type="button"
            @click="togglePerm(p.key)"
          >{{ p.label }}</button>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-primary" type="button" :disabled="saving" @click="saveRole">{{ saving ? '保存中...' : '保存' }}</button>
      </template>
    </Modal>

    <Modal v-model="adminOpen" :title="adminForm.id ? '编辑管理员角色' : '新建管理员'" :dirty="formDirty">
      <label v-if="!adminForm.id" class="field"><span class="field-label">用户名<span class="required">*</span></span><input v-model="adminForm.username" class="input" @input="formDirty = true" /></label>
      <label v-if="!adminForm.id" class="field"><span class="field-label">密码<span class="required">*</span></span><input v-model="adminForm.password" class="input" type="password" @input="formDirty = true" /></label>
      <label class="field"><span class="field-label">姓名<span class="required">*</span></span><input v-model="adminForm.name" class="input" @input="formDirty = true" /></label>
      <label class="field"><span class="field-label">手机号</span><input v-model="adminForm.phone" class="input" @input="formDirty = true" /></label>
      <div class="chips">
        <button
          v-for="r in roles"
          :key="r.id"
          class="tab"
          :class="{ active: adminForm.roleIds.includes(r.id) }"
          type="button"
          @click="toggleRole(r.id)"
        >{{ r.name }}</button>
      </div>
      <template #footer>
        <button class="btn btn-primary" type="button" :disabled="saving" @click="saveAdmin">{{ saving ? '保存中...' : '保存' }}</button>
      </template>
    </Modal>

    <ConfirmDialog
      v-model="confirmOpen"
      title="删除确认"
      :content="`确认删除角色「${confirmRole?.name}」？`"
      desc="删除后不可恢复"
      confirm-text="删除"
      tone="danger"
      @confirm="doRemoveRole"
    />
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { adminApi } from '../api/client';
import { badgeTone } from '../constants';
import { useToastStore } from '../stores/toast';
import Modal from '../components/Modal.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';

const toast = useToastStore();
const roles = ref([]);
const admins = ref([]);
const permGroups = ref({});
const roleOpen = ref(false);
const adminOpen = ref(false);
const saving = ref(false);
const formDirty = ref(false);
const confirmOpen = ref(false);
const confirmRole = ref(null);
const roleForm = reactive({ id: null, name: '', description: '', permissions: [] });
const adminForm = reactive({ id: null, username: '', password: '', name: '', phone: '', roleIds: [] });

async function fetchData() {
  try {
    const [r, p, a] = await Promise.all([
      adminApi.fetchRoles(),
      adminApi.fetchPermissions(),
      adminApi.fetchAdmins(),
    ]);
    roles.value = r || [];
    admins.value = a || [];
    const groups = {};
    for (const item of p || []) {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    }
    permGroups.value = groups;
  } catch (e) {
    toast.error(e.message);
  }
}

function openNewRole() {
  Object.assign(roleForm, { id: null, name: '', description: '', permissions: [] });
  formDirty.value = false;
  roleOpen.value = true;
}
function openEditRole(r) {
  Object.assign(roleForm, { id: r.id, name: r.name, description: r.description || '', permissions: [...(r.permissions || [])] });
  formDirty.value = false;
  roleOpen.value = true;
}
function togglePerm(key) {
  const i = roleForm.permissions.indexOf(key);
  if (i >= 0) roleForm.permissions.splice(i, 1);
  else roleForm.permissions.push(key);
  formDirty.value = true;
}
async function saveRole() {
  if (!roleForm.name?.trim()) { toast.error('角色名不能为空'); return; }
  saving.value = true;
  try {
    const body = { name: roleForm.name, description: roleForm.description, permissions: roleForm.permissions };
    if (roleForm.id) await adminApi.updateRole(roleForm.id, body);
    else await adminApi.createRole(body);
    toast.success('保存成功');
    formDirty.value = false;
    roleOpen.value = false;
    fetchData();
  } catch (e) {
    toast.error(e.message);
  } finally {
    saving.value = false;
  }
}
function askRemoveRole(r) {
  confirmRole.value = r;
  confirmOpen.value = true;
}
async function doRemoveRole() {
  try {
    await adminApi.deleteRole(confirmRole.value.id);
    toast.success('已删除');
    fetchData();
  } catch (e) {
    toast.error(e.message);
  }
}

function openNewAdmin() {
  Object.assign(adminForm, { id: null, username: '', password: '', name: '', phone: '', roleIds: [] });
  formDirty.value = false;
  adminOpen.value = true;
}
function openEditAdmin(a) {
  Object.assign(adminForm, {
    id: a.id,
    username: a.username,
    password: '',
    name: a.name || '',
    phone: a.phone || '',
    roleIds: (a.roles || []).map((r) => r.id),
  });
  formDirty.value = false;
  adminOpen.value = true;
}
function toggleRole(id) {
  const i = adminForm.roleIds.indexOf(id);
  if (i >= 0) adminForm.roleIds.splice(i, 1);
  else adminForm.roleIds.push(id);
  formDirty.value = true;
}
async function saveAdmin() {
  if (!adminForm.name?.trim()) { toast.error('姓名不能为空'); return; }
  if (!adminForm.id && (!adminForm.username || !adminForm.password)) {
    toast.error('请填写用户名和密码');
    return;
  }
  saving.value = true;
  try {
    const body = { name: adminForm.name, phone: adminForm.phone, roleIds: adminForm.roleIds };
    if (adminForm.id) {
      await adminApi.updateAdminWithRoles(adminForm.id, body);
    } else {
      await adminApi.createAdminWithRoles({ ...body, username: adminForm.username, password: adminForm.password });
    }
    toast.success('保存成功');
    formDirty.value = false;
    adminOpen.value = false;
    fetchData();
  } catch (e) {
    toast.error(e.message);
  } finally {
    saving.value = false;
  }
}
async function toggleAdmin(a) {
  try {
    await adminApi.toggleAdminStatus(a.id);
    toast.success('状态已更新');
    fetchData();
  } catch (e) {
    toast.error(e.message);
  }
}

onMounted(fetchData);
</script>

<style scoped>
.perm-g { margin-top: 8px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
</style>
