<template>
  <view class="role-page">
    <view class="page-head">
      <text class="page-title">角色管理</text>
      <view class="add-btn" @click="openNewRole">新建角色</view>
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
      <view class="add-btn" @click="openNewAdmin">新建管理员</view>
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
    <view v-if="roleModal" class="modal-mask" @click="roleModal = false">
      <view class="modal-box" @click.stop>
        <view class="modal-title">{{ roleForm.id ? '编辑角色' : '新建角色' }}</view>
        <view class="form-row">
          <text class="form-label">角色名</text>
          <input v-model="roleForm.name" class="form-input" placeholder="角色名" />
        </view>
        <view class="form-row">
          <text class="form-label">描述</text>
          <input v-model="roleForm.description" class="form-input" placeholder="描述" />
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
        <view class="modal-btn" @click="saveRole">保存</view>
      </view>
    </view>

    <!-- 管理员编辑弹层 -->
    <view v-if="adminModal" class="modal-mask" @click="adminModal = false">
      <view class="modal-box" @click.stop>
        <view class="modal-title">{{ adminForm.id ? '编辑管理员' : '新建管理员' }}</view>
        <view v-if="!adminForm.id" class="form-row">
          <text class="form-label">用户名</text>
          <input v-model="adminForm.username" class="form-input" placeholder="用户名" />
        </view>
        <view v-if="!adminForm.id" class="form-row">
          <text class="form-label">密码</text>
          <input v-model="adminForm.password" class="form-input" password placeholder="密码" />
        </view>
        <view class="form-row">
          <text class="form-label">姓名</text>
          <input v-model="adminForm.name" class="form-input" placeholder="姓名" />
        </view>
        <view class="form-row">
          <text class="form-label">手机号</text>
          <input v-model="adminForm.phone" class="form-input" placeholder="手机号" />
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
        <view class="modal-btn" @click="saveAdmin">保存</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/admin/adminApi';

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
  roleModal.value = true;
}
function openEditRole(r) {
  Object.assign(roleForm, { id: r.id, name: r.name, description: r.description || '', permissions: [...(r.permissions || [])] });
  roleModal.value = true;
}
function togglePerm(key) {
  const i = roleForm.permissions.indexOf(key);
  if (i >= 0) roleForm.permissions.splice(i, 1);
  else roleForm.permissions.push(key);
}
async function saveRole() {
  const body = {
    name: roleForm.name,
    description: roleForm.description,
    permissions: roleForm.permissions,
  };
  try {
    if (roleForm.id) {
      await adminApi.updateRole(roleForm.id, body);
    } else {
      await adminApi.createRole(body);
    }
    uni.showToast({ title: '保存成功', icon: 'success' });
    roleModal.value = false;
    fetchData();
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  }
}
function removeRole(r) {
  uni.showModal({
    title: '提示',
    content: `确认删除角色「${r.name}」？`,
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await adminApi.deleteRole(r.id);
        uni.showToast({ title: '已删除', icon: 'success' });
        fetchData();
      } catch (e) {
        uni.showToast({ title: e.message, icon: 'none' });
      }
    },
  });
}

function openNewAdmin() {
  Object.assign(adminForm, { id: null, username: '', password: '', name: '', phone: '', roleIds: [] });
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
  adminModal.value = true;
}
function toggleRole(id) {
  const i = adminForm.roleIds.indexOf(id);
  if (i >= 0) adminForm.roleIds.splice(i, 1);
  else adminForm.roleIds.push(id);
}
async function saveAdmin() {
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
    adminModal.value = false;
    fetchData();
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
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
.role-page { min-height: 100vh; background: #F2F4F5; padding: 16rpx 24rpx; }
.page-head { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; }
.page-title { font-size: 32rpx; font-weight: 700; color: #1A1A1A; }
.add-btn { font-size: 24rpx; color: #048C47; padding: 6rpx 24rpx; border: 1px solid #048C47; border-radius: 28rpx; }
.card-item { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.card-item__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.card-item__title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; }
.card-item__sub { font-size: 22rpx; color: #B0B0B0; }
.card-item__info { font-size: 24rpx; color: #7A7A7A; margin-bottom: 8rpx; }
.perm-list { display: flex; flex-wrap: wrap; margin-top: 8rpx; }
.perm-tag { font-size: 20rpx; color: #1B7FE0; background: #EAF4FF; border-radius: 8rpx; padding: 2rpx 10rpx; margin: 0 8rpx 8rpx 0; }
.perm-tag.more { color: #7A7A7A; background: #F2F4F5; }
.status-tag { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; }
.tone-verified { color: #048C47; background: #E4F7EC; }
.tone-hot { color: #E54848; background: #FDECEC; }
.card-item__actions { display: flex; justify-content: flex-end; margin-top: 12rpx; gap: 16rpx; }
.act-btn { padding: 8rpx 28rpx; border-radius: 32rpx; border: 1px solid #048C47; color: #048C47; font-size: 24rpx; }
.act-btn.danger { border-color: #E54848; color: #E54848; }
.modal-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 999; display: flex; align-items: flex-end; }
.modal-box { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom)); max-height: 85vh; overflow-y: auto; }
.modal-title { font-size: 32rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 24rpx; text-align: center; }
.form-row { display: flex; align-items: center; padding: 12rpx 0; }
.form-label { width: 140rpx; font-size: 26rpx; color: #7A7A7A; flex-shrink: 0; }
.form-input { flex: 1; height: 72rpx; background: #F7F8F9; border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; }
.perm-group { margin-top: 16rpx; }
.perm-group__title { font-size: 24rpx; font-weight: 600; color: #333; margin-bottom: 8rpx; }
.perm-options { display: flex; flex-wrap: wrap; }
.perm-option { font-size: 22rpx; padding: 6rpx 20rpx; border-radius: 24rpx; border: 1px solid #DDD; color: #555; margin: 0 12rpx 12rpx 0; }
.perm-option.active { border-color: #048C47; color: #048C47; background: #E4F7EC; }
.modal-btn { margin-top: 32rpx; height: 80rpx; line-height: 80rpx; text-align: center; background: #048C47; color: #fff; border-radius: 40rpx; font-size: 28rpx; }
</style>