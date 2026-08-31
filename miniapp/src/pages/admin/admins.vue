<template>
  <view class="admin-list-page">
    <view class="page-head">
      <text class="page-title">管理员管理</text>
      <view class="head-actions">
        <text class="refresh-btn" @click="fetchList(page)">刷新</text>
        <view class="add-btn" @click="openNew">新建管理员</view>
      </view>
    </view>

    <view class="filter-bar">
      <SearchBar v-model="keywordInput" placeholder="搜索用户名/姓名/手机号" @search="onSearch" @clear="onClear" />
      <view class="filter-tabs">
        <view
          v-for="s in statusOptions"
          :key="s.value"
          class="filter-tab"
          :class="{ active: status === s.value }"
          @click="selectStatus(s.value)"
        >{{ s.label }}</view>
      </view>
    </view>

    <StateView
      :loading="loading"
      :empty="!loading && list.length === 0"
      empty-title="暂无管理员"
      empty-desc="点击右上角「新建管理员」添加"
      :skeleton-count="4"
    >
      <view v-for="item in list" :key="item.id" class="card-item">
        <view class="card-item__head">
          <text class="card-item__title">{{ item.name || item.username }}</text>
          <view class="status-select" @click="toggleStatus(item)">
            <text class="status-tag" :class="item.status === 'active' ? 'tone-verified' : 'tone-hot'">{{ item.status === 'active' ? '启用' : '停用' }}</text>
          </view>
        </view>
        <view class="card-item__info">
          <text>{{ item.username }}</text>
          <text>{{ item.phone || '-' }}</text>
        </view>
        <view class="card-item__info"><text>创建于 {{ formatDate(item.created_at) }}</text></view>
        <view class="card-item__actions">
          <view class="act-btn" @click="openEdit(item)">编辑</view>
          <view class="act-btn danger" @click="confirmRemove(item)">删除</view>
        </view>
      </view>
    </StateView>

    <Pagination :page="page" :page-count="pageCount" :total="total" @change="goPage" />

    <!-- 编辑弹层 -->
    <view v-if="editItem" class="modal-mask" @click="editItem = null">
      <view class="modal-box" @click.stop>
        <view class="modal-title">{{ editItem.id ? '编辑管理员' : '新建管理员' }}</view>
        <view v-if="!editItem.id" class="form-row">
          <text class="form-label">用户名</text>
          <view class="form-field">
            <input
              v-model="editForm.username"
              class="form-input"
              :class="{ 'form-input--error': errors.username }"
              placeholder="用户名"
              @blur="validateField('username')"
            />
            <text v-if="errors.username" class="form-error">{{ errors.username }}</text>
          </view>
        </view>
        <view v-if="!editItem.id" class="form-row">
          <text class="form-label">密码</text>
          <view class="form-field">
            <input
              v-model="editForm.password"
              class="form-input"
              :class="{ 'form-input--error': errors.password }"
              password
              placeholder="密码"
              @blur="validateField('password')"
            />
            <text v-if="errors.password" class="form-error">{{ errors.password }}</text>
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">姓名</text>
          <view class="form-field">
            <input
              v-model="editForm.name"
              class="form-input"
              :class="{ 'form-input--error': errors.name }"
              placeholder="姓名"
              @blur="validateField('name')"
            />
            <text v-if="errors.name" class="form-error">{{ errors.name }}</text>
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">手机号</text>
          <view class="form-field">
            <input v-model="editForm.phone" class="form-input" placeholder="手机号" />
          </view>
        </view>
        <view class="modal-btn" @click="save">保存</view>
      </view>
    </view>

    <ConfirmDialog
      v-model:visible="confirmVisible"
      title="删除确认"
      :content="`确认删除管理员「${confirmItem?.username}」？`"
      desc="删除后不可恢复"
      confirm-text="删除"
      tone="danger"
      @confirm="doRemove"
    />
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/admin/adminApi';
import { formatDate } from '@/common/constants';
import SearchBar from '@/components/SearchBar.vue';
import Pagination from '@/components/Pagination.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import StateView from '@/components/StateView.vue';

const list = ref([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = 10;
const keywordInput = ref('');
const status = ref('');
const editItem = ref(null);
const editForm = ref({});
const errors = reactive({ username: '', password: '', name: '' });
const confirmVisible = ref(false);
const confirmItem = ref(null);

const statusOptions = [
  { label: '全部', value: '' },
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
];

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

async function fetchList(p = 1) {
  loading.value = true;
  try {
    const res = await adminApi.getAdmins({
      page: p,
      pageSize,
      keyword: keywordInput.value || undefined,
      status: status.value || undefined,
    });
    list.value = res.list || [];
    total.value = res.total || 0;
    page.value = p;
  } catch (e) {
    uni.showToast({ title: e.message || '获取失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

onShow(() => fetchList(1));

function onSearch() { fetchList(1); }
function onClear() { fetchList(1); }
function selectStatus(s) { status.value = s; fetchList(1); }
function goPage(p) {
  if (p < 1 || p > pageCount.value || p === page.value) return;
  fetchList(p);
}

function openNew() {
  editItem.value = { id: null };
  editForm.value = { username: '', password: '', name: '', phone: '' };
  errors.username = '';
  errors.password = '';
  errors.name = '';
}
function openEdit(item) {
  editItem.value = item;
  editForm.value = { name: item.name || '', phone: item.phone || '' };
  errors.username = '';
  errors.password = '';
  errors.name = '';
}
function validateField(field) {
  if (field === 'username') {
    errors.username = editForm.value.username && editForm.value.username.trim() ? '' : '用户名不能为空';
  } else if (field === 'password') {
    errors.password = editForm.value.password && editForm.value.password.trim() ? '' : '密码不能为空';
  } else if (field === 'name') {
    errors.name = editForm.value.name && editForm.value.name.trim() ? '' : '姓名不能为空';
  }
}
async function save() {
  validateField('name');
  if (!editItem.value.id) {
    validateField('username');
    validateField('password');
  }
  if (errors.name || errors.username || errors.password) {
    const msg = errors.name || errors.username || errors.password;
    uni.showToast({ title: msg, icon: 'none' });
    return;
  }
  try {
    if (editItem.value.id) {
      await adminApi.updateAdmin(editItem.value.id, {
        name: editForm.value.name,
        phone: editForm.value.phone,
      });
    } else {
      await adminApi.createAdmin({
        username: editForm.value.username,
        password: editForm.value.password,
        name: editForm.value.name,
        phone: editForm.value.phone,
      });
    }
    uni.showToast({ title: '保存成功', icon: 'success' });
    editItem.value = null;
    fetchList(page.value);
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  }
}
async function toggleStatus(item) {
  const next = item.status === 'active' ? 'inactive' : 'active';
  try {
    await adminApi.updateAdmin(item.id, { status: next });
    uni.showToast({ title: '状态已更新', icon: 'success' });
    fetchList(page.value);
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  }
}
function confirmRemove(item) {
  confirmItem.value = item;
  confirmVisible.value = true;
}
async function doRemove() {
  if (!confirmItem.value) return;
  try {
    await adminApi.deleteAdmin(confirmItem.value.id);
    uni.showToast({ title: '已删除', icon: 'success' });
    confirmItem.value = null;
    fetchList(page.value);
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  }
}
</script>

<style lang="scss" scoped>
.admin-list-page { min-height: 100vh; background: #F2F4F5; padding: 16rpx 24rpx 140rpx; }
.page-head { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; }
.page-title { font-size: 32rpx; font-weight: 700; color: #1A1A1A; }
.head-actions { display: flex; align-items: center; gap: 16rpx; }
.refresh-btn { font-size: 24rpx; color: #666; padding: 6rpx 16rpx; border: 1px solid #ccc; border-radius: 28rpx; }
.add-btn { font-size: 24rpx; color: #048C47; padding: 6rpx 24rpx; border: 1px solid #048C47; border-radius: 28rpx; }
.filter-bar { margin-bottom: 16rpx; }
.filter-tabs { display: flex; flex-wrap: wrap; margin-top: 16rpx; }
.filter-tab { padding: 8rpx 24rpx; margin-right: 16rpx; margin-bottom: 12rpx; border-radius: 28rpx; font-size: 24rpx; color: #7A7A7A; background: #fff; }
.filter-tab.active { color: #fff; background: #048C47; }
.card-item { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.card-item__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.card-item__title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; }
.status-select { display: flex; }
.status-tag { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; }
.tone-verified { color: #048C47; background: #E4F7EC; }
.tone-hot { color: #E54848; background: #FDECEC; }
.card-item__info { display: flex; justify-content: space-between; font-size: 24rpx; color: #7A7A7A; margin-bottom: 8rpx; }
.card-item__actions { display: flex; justify-content: flex-end; margin-top: 12rpx; gap: 16rpx; }
.act-btn { padding: 8rpx 28rpx; border-radius: 32rpx; border: 1px solid #048C47; color: #048C47; font-size: 24rpx; }
.act-btn.danger { border-color: #E54848; color: #E54848; }
.modal-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 999; display: flex; align-items: flex-end; }
.modal-box { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom)); max-height: 85vh; overflow-y: auto; }
.modal-title { font-size: 32rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 24rpx; text-align: center; }
.form-row { display: flex; align-items: flex-start; padding: 12rpx 0; }
.form-label { width: 140rpx; font-size: 26rpx; color: #7A7A7A; flex-shrink: 0; line-height: 72rpx; }
.form-field { flex: 1; }
.form-input { width: 100%; height: 72rpx; background: #F7F8F9; border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; box-sizing: border-box; border: 1px solid transparent; }
.form-input--error { border-color: #E54848; background: #FEF2F2; }
.form-error { display: block; font-size: 22rpx; color: #E54848; margin-top: 8rpx; padding-left: 8rpx; }
.modal-btn { margin-top: 32rpx; height: 80rpx; line-height: 80rpx; text-align: center; background: #048C47; color: #fff; border-radius: 40rpx; font-size: 28rpx; }
</style>
