<template>
  <view class="role-page">
    <view class="page-head">
      <text class="page-title">角色管理</text>
      <view class="head-actions">
        <text class="refresh-btn" @click="fetchData">刷新</text>
        <view class="add-btn" @click="openNewRole">新建角色</view>
      </view>
    </view>

    <view class="card-item" v-for="r in roles" :key="r.id">
      <view class="card-item__head">
        <text class="card-item__title">{{ r.name }}</text>
        <text class="card-item__sub">ID {{ r.id }}</text>
      </view>
      <view class="card-item__info"><text>{{ r.description || '暂无描述' }}</text></view>
      <view class="card-item__info"><text>权限数 {{ (r.permissions || []).length }}</text></view>
      <view class="perm-list">
        <text v-for="p in (r.permissions || []).slice(0, 12)" :key="p" class="perm-tag">{{ p }}</text>
        <text v-if="(r.permissions || []).length > 12" class="perm-tag more">+{{ (r.permissions || []).length - 12 }}</text>
      </view>
      <view class="card-item__actions">
        <view class="act-btn" @click="openEditRole(r)">编辑</view>
        <view class="act-btn danger" @click="removeRole(r)">删除</view>
      </view>
    </view>

    <view class="page-head" style="margin-top: 32rpx;">
      <text class="page-title">管理员</text>
      <view class="head-actions">
        <text class="refresh-btn" @click="fetchData">刷新</text>
        <view class="add-btn" @click="openNewAdmin">新建管理员</view>
      </view>
    </view>

    <view class="card-item" v-for="a in admins" :key="a.id">
      <view class="card-item__head">
        <text class="card-item__title">{{ a.name || a.username }}</text>
        <text class="status-tag" :class="a.status === 'active' ? 'tone-verified' : 'tone-hot'">{{ a.status === 'active' ? '正常' : '禁用' }}</text>
      </view>
      <view class="card-item__info"><text>{{ a.username }}</text><text>{{ a.phone || '-' }}</text></view>
      <view class="perm-list">
        <text v-for="r in (a.roles || [])" :key="r.id" class="perm-tag">{{ r.name }}</text>
      </view>
      <view class="card-item__actions">
        <view class="act-btn" @click="openEditAdmin(a)">编辑</view>
        <view class="act-btn" @click="toggleAdmin(a)">{{ a.status === 'active' ? '禁用' : '启用' }}</view>
      </view>
    </view>

    <!-- 角色编辑弹层 -->
    <view v-if="roleModal" class="modal-mask" @click="tryCloseRole">
      <view class="modal-box" @click.stop>
        <view class="modal-title">{{ roleForm.id ? '编辑角色' : '新建角色' }}</view>
        <view class="modal-close" @click.stop="tryCloseRole">×</view>
        <view class="form-row">
          <text class="form-label">角色名<text class="required-mark">*</text></text>
          <input v-model="roleForm.name" class="form-input" placeholder="角色名" @input="formDirty = true" />
        </view>
        <view class="form-row">
          <text class="form-label">描述</text>
          <input v-model="roleForm.description" class="form-input" placeholder="描述" @input="formDirty = true" />
        </view>
        <view class="perm-group" v-for="(perms, group) in permGroups" :key="group">
          <view class="perm-group__title">{{ group }}</view>
          <view class="perm-options">
            <view
              v-for="p in perms"
              :key="p.key"
              class="perm-option"
              :class="{ active: roleForm.permissions.includes(p.key) }"
              @click="togglePerm(p.key)"
            >{{ p.label }}</view>
          </view>
        </view>
        <view class="modal-btn" :class="{ disabled: saving }" @click="saveRole">{{ saving ? '保存中...' : '保存' }}</view>
      </view>
    </view>

    <!-- 管理员编辑弹层 -->
    <view v-if="adminModal" class="modal-mask" @click="tryCloseAdmin">
      <view class="modal-box" @click.stop>
        <view class="modal-title">{{ adminForm.id ? '编辑管理员' : '新建管理员' }}</view>
        <view class="modal-close" @click.stop="tryCloseAdmin">×</view>
        <view v-if="!adminForm.id" class="form-row">
          <text class="form-label">用户名<text class="required-mark">*</text></text>
          <input v-model="adminForm.username" class="form-input" placeholder="用户名" @input="formDirty = true" />
        </view>
        <view v-if="!adminForm.id" class="form-row">
          <text class="form-label">密码<text class="required-mark">*</text></text>
          <view class="password-wrap">
            <input v-model="adminForm.password" class="form-input" :type="passwordVisible ? 'text' : 'password'" placeholder="密码" @input="formDirty = true" />
            <text class="password-toggle" @click="passwordVisible = !passwordVisible">{{ passwordVisible ? '隐藏' : '显示' }}</text>
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">姓名<text class="required-mark">*</text></text>
          <input v-model="adminForm.name" class="form-input" placeholder="姓名" @input="formDirty = true" />
        </view>
        <view class="form-row">
          <text class="form-label">手机号</text>
          <input v-model="adminForm.phone" class="form-input" inputmode="tel" placeholder="手机号" @input="formDirty = true" />
        </view>
        <view class="form-row" style="align-items: flex-start;">
          <text class="form-label">角色</text>
          <view class="perm-options" style="flex: 1;">
            <view
              v-for="r in roles"
              :key="r.id"
              class="perm-option"
              :class="{ active: adminForm.roleIds.includes(r.id) }"
              @click="toggleRole(r.id)"
            >{{ r.name }}</view>
          </view>
        </view>
        <view class="modal-btn" :class="{ disabled: saving }" @click="saveAdmin">{{ saving ? '保存中...' : '保存' }}</view>
      </view>
    </view>

    <ConfirmDialog
      v-model:visible="confirmRoleVisible"
      title="删除确认"
      :content="`确认删除角色「${confirmRole?.name}」？`"
      desc="删除后不可恢复"
      confirm-text="删除"
      tone="danger"
      @confirm="doRemoveRole"
    />
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/admin/adminApi';
import ConfirmDialog from '@/components/ConfirmDialog.vue';

const confirmRoleVisible = ref(false);
const confirmRole = ref(null);
const saving = ref(false);
const passwordVisible = ref(false);
const formDirty = ref(false);

const roles = ref([]);
const admins = ref([]);
const permGroups = ref({});
const roleModal = ref(false);
const adminModal = ref(false);
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
    uni.showToast({ title: e.message, icon: 'none' });
  }
}

onShow(() => fetchData());

function openNewRole() {
  Object.assign(roleForm, { id: null, name: '', description: '', permissions: [] });
  formDirty.value = false;
  roleModal.value = true;
}
function openEditRole(r) {
  Object.assign(roleForm, { id: r.id, name: r.name, description: r.description || '', permissions: [...(r.permissions || [])] });
  formDirty.value = false;
  roleModal.value = true;
}
function togglePerm(key) {
  const i = roleForm.permissions.indexOf(key);
  if (i >= 0) roleForm.permissions.splice(i, 1);
  else roleForm.permissions.push(key);
  formDirty.value = true;
}
async function saveRole() {
  if (!roleForm.name || !roleForm.name.trim()) {
    uni.showToast({ title: '角色名不能为空', icon: 'none' });
    return;
  }
  const body = {
    name: roleForm.name,
    description: roleForm.description,
    permissions: roleForm.permissions,
  };
  saving.value = true;
  try {
    if (roleForm.id) {
      await adminApi.updateRole(roleForm.id, body);
    } else {
      await adminApi.createRole(body);
    }
    uni.showToast({ title: '保存成功', icon: 'success' });
    formDirty.value = false;
    roleModal.value = false;
    fetchData();
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  } finally {
    saving.value = false;
  }
}
function tryCloseRole() {
  if (formDirty.value) {
    uni.showModal({
      title: '提示',
      content: '表单有未保存的修改，确认关闭？',
      success: (res) => {
        if (res.confirm) {
          formDirty.value = false;
          roleModal.value = false;
        }
      },
    });
  } else {
    roleModal.value = false;
  }
}
function removeRole(r) {
  confirmRole.value = r;
  confirmRoleVisible.value = true;
}
async function doRemoveRole() {
  if (!confirmRole.value) return;
  try {
    await adminApi.deleteRole(confirmRole.value.id);
    uni.showToast({ title: '已删除', icon: 'success', duration: 2000 });
    confirmRole.value = null;
    fetchData();
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  }
}

function openNewAdmin() {
  Object.assign(adminForm, { id: null, username: '', password: '', name: '', phone: '', roleIds: [] });
  formDirty.value = false;
  adminModal.value = true;
}
function openEditAdmin(a) {
  Object.assign(adminForm, {
    id: a.id,
    username: a.username || '',
    password: '',
    name: a.name || '',
    phone: a.phone || '',
    roleIds: (a.roles || []).map((r) => r.id),
  });
  formDirty.value = false;
  adminModal.value = true;
}
function toggleRole(id) {
  const i = adminForm.roleIds.indexOf(id);
  if (i >= 0) adminForm.roleIds.splice(i, 1);
  else adminForm.roleIds.push(id);
  formDirty.value = true;
}
async function saveAdmin() {
  if (!adminForm.id && (!adminForm.username || !adminForm.password)) {
    uni.showToast({ title: '用户名和密码不能为空', icon: 'none' });
    return;
  }
  if (!adminForm.name || !adminForm.name.trim()) {
    uni.showToast({ title: '姓名不能为空', icon: 'none' });
    return;
  }
  saving.value = true;
  try {
    if (adminForm.id) {
      await adminApi.updateAdminWithRoles(adminForm.id, {
        name: adminForm.name,
        phone: adminForm.phone,
        roleIds: adminForm.roleIds,
      });
    } else {
      await adminApi.createAdminWithRoles({
        username: adminForm.username,
        password: adminForm.password,
        name: adminForm.name,
        phone: adminForm.phone,
        roleIds: adminForm.roleIds,
      });
    }
    uni.showToast({ title: '保存成功', icon: 'success' });
    formDirty.value = false;
    adminModal.value = false;
    fetchData();
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  } finally {
    saving.value = false;
  }
}
function tryCloseAdmin() {
  if (formDirty.value) {
    uni.showModal({
      title: '提示',
      content: '表单有未保存的修改，确认关闭？',
      success: (res) => {
        if (res.confirm) {
          formDirty.value = false;
          adminModal.value = false;
        }
      },
    });
  } else {
    adminModal.value = false;
  }
}
async function toggleAdmin(a) {
  try {
    await adminApi.toggleAdminStatus(a.id);
    uni.showToast({ title: '状态已更新', icon: 'success' });
    fetchData();
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  }
}
</script>

<style lang="scss" scoped>
.role-page { touch-action: manipulation;
  min-height: 100dvh; background: #F2F4F5; padding: 16rpx 24rpx 140rpx; }
.page-head { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; }
.page-title { font-size: 32rpx; font-weight: 700; color: #1A1A1A; }
.head-actions { display: flex; align-items: center; gap: 16rpx; }
.refresh-btn { font-size: 24rpx; color: #666; min-height: 88rpx; line-height: 88rpx; padding: 0 20rpx; border: 1px solid #999; border-radius: 28rpx; }
.add-btn { font-size: 24rpx; color: #037539; min-height: 88rpx; line-height: 88rpx; padding: 0 24rpx; border: 1px solid #037539; border-radius: 28rpx; }
.card-item { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.card-item__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.card-item__title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; }
.card-item__sub { font-size: 22rpx; color: #666666; }
.card-item__info { font-size: 24rpx; color: #555555; margin-bottom: 8rpx; }
.perm-list { display: flex; flex-wrap: wrap; margin-top: 8rpx; }
.perm-tag { font-size: 20rpx; color: #1B7FE0; background: #EAF4FF; border-radius: 8rpx; padding: 2rpx 10rpx; margin: 0 8rpx 8rpx 0; }
.perm-tag.more { color: #555555; background: #F2F4F5; }
.status-tag { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; }
.tone-verified { color: #037539; background: #E4F7EC; }
.tone-hot { color: #E54848; background: #FDECEC; }
.card-item__actions { display: flex; justify-content: flex-end; margin-top: 12rpx; gap: 16rpx; }
.act-btn { min-height: 88rpx; line-height: 88rpx; padding: 0 24rpx; border-radius: 32rpx; border: 1px solid #037539; color: #037539; font-size: 24rpx; }
.act-btn.danger { border-color: #E54848; color: #E54848; }
.modal-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 999; display: flex; align-items: flex-end; }
.modal-box { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom)); max-height: 85vh; overflow-y: auto; position: relative; }
.modal-title { font-size: 32rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 24rpx; text-align: center; }
.form-row { display: flex; align-items: center; padding: 12rpx 0; }
.form-label { width: 140rpx; font-size: 26rpx; color: #555555; flex-shrink: 0; }
.form-input { flex: 1; height: 72rpx; background: #F7F8F9; border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; }
.form-input:focus { border-color: #037539; background: #fff; }
.perm-group { margin-top: 16rpx; }
.perm-group__title { font-size: 24rpx; font-weight: 600; color: #333; margin-bottom: 8rpx; }
.perm-options { display: flex; flex-wrap: wrap; }
.perm-option { font-size: 22rpx; padding: 6rpx 20rpx; border-radius: 24rpx; border: 1px solid #CCC; color: #555; margin: 0 12rpx 12rpx 0; }
.perm-option.active { border-color: #037539; color: #037539; background: #E4F7EC; }
.modal-btn { margin-top: 32rpx; height: 88rpx; line-height: 88rpx; text-align: center; background: #037539; color: #fff; border-radius: 40rpx; font-size: 28rpx; }
.modal-btn.disabled { opacity: 0.6; }
.required-mark { color: #E54848; margin-left: 4rpx; }
.password-wrap { position: relative; flex: 1; }
.password-toggle { position: absolute; right: 20rpx; top: 50%; transform: translateY(-50%); font-size: 24rpx; color: #037539; padding: 12rpx; line-height: 1; }
.modal-mask { animation: mask-fade-in 200ms ease-out; }
.modal-box { animation: sheet-slide-up 250ms cubic-bezier(0.32, 0.72, 0, 1); }
.modal-close { position: absolute; top: 16rpx; right: 24rpx; width: 56rpx; height: 56rpx; line-height: 56rpx; text-align: center; font-size: 36rpx; color: #999; z-index: 1; }
@keyframes mask-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes sheet-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
</style>