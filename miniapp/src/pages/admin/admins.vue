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
    <view v-if="editItem" class="modal-mask" @click="tryCloseEdit">
      <view class="modal-box" @click.stop>
        <view class="modal-title">{{ editItem.id ? '编辑管理员' : '新建管理员' }}</view>
        <view class="modal-close" @click.stop="tryCloseEdit">×</view>
        <view v-if="!editItem.id" class="form-row">
          <text class="form-label">用户名<text class="required-mark">*</text></text>
          <view class="form-field">
            <input
              v-model="editForm.username"
              class="form-input"
              :class="{ 'form-input--error': errors.username }"
              placeholder="用户名"
              @input="formDirty = true"
              @blur="validateField('username')"
            />
            <text v-if="errors.username" class="form-error">{{ errors.username }}</text>
          </view>
        </view>
        <view v-if="!editItem.id" class="form-row">
          <text class="form-label">密码<text class="required-mark">*</text></text>
          <view class="form-field">
            <view class="password-wrap">
              <input
                v-model="editForm.password"
                class="form-input"
                :class="{ 'form-input--error': errors.password }"
                :type="passwordVisible ? 'text' : 'password'"
                placeholder="密码"
                @input="formDirty = true"
                @blur="validateField('password')"
              />
              <text class="password-toggle" @click="passwordVisible = !passwordVisible">{{ passwordVisible ? '隐藏' : '显示' }}</text>
            </view>
            <text v-if="errors.password" class="form-error">{{ errors.password }}</text>
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">姓名<text class="required-mark">*</text></text>
          <view class="form-field">
            <input
              v-model="editForm.name"
              class="form-input"
              :class="{ 'form-input--error': errors.name }"
              placeholder="姓名"
              @input="formDirty = true"
              @blur="validateField('name')"
            />
            <text v-if="errors.name" class="form-error">{{ errors.name }}</text>
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">手机号</text>
          <view class="form-field">
            <input v-model="editForm.phone" class="form-input" inputmode="tel" placeholder="手机号" @input="formDirty = true" />
          </view>
        </view>
        <view class="modal-btn" :class="{ disabled: saving }" @click="save">{{ saving ? '保存中...' : '保存' }}</view>
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
const saving = ref(false);
const passwordVisible = ref(false);
const formDirty = ref(false);

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
  formDirty.value = false;
}
function openEdit(item) {
  editItem.value = item;
  editForm.value = { name: item.name || '', phone: item.phone || '' };
  errors.username = '';
  errors.password = '';
  errors.name = '';
  formDirty.value = false;
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
  saving.value = true;
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
    formDirty.value = false;
    editItem.value = null;
    fetchList(page.value);
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  } finally {
    saving.value = false;
  }
}
function tryCloseEdit() {
  if (formDirty.value) {
    uni.showModal({
      title: '提示',
      content: '表单有未保存的修改，确认关闭？',
      success: (res) => {
        if (res.confirm) {
          formDirty.value = false;
          editItem.value = null;
        }
      },
    });
  } else {
    editItem.value = null;
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
    uni.showToast({ title: '已删除', icon: 'success', duration: 2000 });
    confirmItem.value = null;
    fetchList(page.value);
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  }
}
</script>

<style lang="scss" scoped>
.admin-list-page { touch-action: manipulation;
  min-height: 100dvh; background: #F2F4F5; padding: 16rpx 24rpx 140rpx; }
.page-head { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; }
.page-title { font-size: 32rpx; font-weight: 700; color: #1A1A1A; }
.head-actions { display: flex; align-items: center; gap: 16rpx; }
.refresh-btn { font-size: 24rpx; color: #666; min-height: 88rpx; line-height: 88rpx; padding: 0 20rpx; border: 1px solid #999; border-radius: 28rpx; }
.add-btn { font-size: 24rpx; color: #037539; min-height: 88rpx; line-height: 88rpx; padding: 0 24rpx; border: 1px solid #037539; border-radius: 28rpx; }
.filter-bar { margin-bottom: 16rpx; }
.filter-tabs { display: flex; flex-wrap: wrap; margin-top: 16rpx; }
.filter-tab { min-height: 72rpx; line-height: 72rpx; padding: 0 24rpx; margin-right: 16rpx; margin-bottom: 12rpx; border-radius: 28rpx; font-size: 24rpx; color: #555555; background: #fff; }
.filter-tab.active { color: #fff; background: #037539; }
.card-item { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.card-item__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.card-item__title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; }
.status-select { display: flex; }
.status-tag { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; }
.tone-verified { color: #037539; background: #E4F7EC; }
.tone-hot { color: #E54848; background: #FDECEC; }
.card-item__info { display: flex; justify-content: space-between; font-size: 24rpx; color: #555555; margin-bottom: 8rpx; }
.card-item__actions { display: flex; justify-content: flex-end; margin-top: 12rpx; gap: 16rpx; }
.act-btn { min-height: 88rpx; line-height: 88rpx; padding: 0 24rpx; border-radius: 32rpx; border: 1px solid #037539; color: #037539; font-size: 24rpx; }
.act-btn.danger { border-color: #E54848; color: #E54848; }
.modal-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 999; display: flex; align-items: flex-end; }
.modal-box { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom)); max-height: 85vh; overflow-y: auto; position: relative; }
.modal-title { font-size: 32rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 24rpx; text-align: center; }
.form-row { display: flex; align-items: flex-start; padding: 12rpx 0; }
.form-label { width: 140rpx; font-size: 26rpx; color: #555555; flex-shrink: 0; line-height: 72rpx; }
.form-field { flex: 1; }
.form-input { width: 100%; height: 72rpx; background: #F7F8F9; border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; box-sizing: border-box; border: 1px solid transparent; }
.form-input:focus { border-color: #037539; background: #fff; }
.form-input--error { border-color: #E54848; background: #FEF2F2; }
.form-error { display: block; font-size: 22rpx; color: #E54848; margin-top: 8rpx; padding-left: 8rpx; }
.modal-btn { margin-top: 32rpx; height: 88rpx; line-height: 88rpx; text-align: center; background: #037539; color: #fff; border-radius: 40rpx; font-size: 28rpx; }
.modal-btn.disabled { opacity: 0.6; }
.required-mark { color: #E54848; margin-left: 4rpx; }
.password-wrap { position: relative; }
.password-toggle { position: absolute; right: 20rpx; top: 50%; transform: translateY(-50%); font-size: 24rpx; color: #037539; padding: 12rpx; line-height: 1; }
.modal-mask { animation: mask-fade-in 200ms ease-out; }
.modal-box { animation: sheet-slide-up 250ms cubic-bezier(0.32, 0.72, 0, 1); }
.modal-close { position: absolute; top: 16rpx; right: 24rpx; width: 56rpx; height: 56rpx; line-height: 56rpx; text-align: center; font-size: 36rpx; color: #999; z-index: 1; }
@keyframes mask-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes sheet-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
</style>
