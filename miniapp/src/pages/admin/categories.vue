<template>
  <view class="admin-list-page">
    <view class="page-head">
      <text class="page-title">分类管理</text>
      <view class="head-actions">
        <text class="refresh-btn" @click="fetchList()">刷新</text>
        <view class="add-btn" @click="openNew">新建分类</view>
      </view>
    </view>

    <view class="filter-bar">
      <SearchBar v-model="keywordInput" placeholder="搜索分类名称" @search="onSearch" @clear="onClear" />
    </view>

    <StateView
      :loading="loading"
      :empty="!loading && list.length === 0"
      empty-title="暂无分类"
      empty-desc="点击右上角「新建分类」添加"
      :skeleton-count="4"
    >
      <view v-for="item in list" :key="item.id" class="card-item">
        <view class="card-item__head">
          <view class="cat-title">
            <image v-if="item.icon" class="cat-icon" :src="item.icon" mode="aspectFill" />
            <text class="card-item__title">{{ item.name }}</text>
          </view>
          <text class="card-item__sub">排序 {{ item.sort_order }}</text>
        </view>
        <view class="card-item__info"><text>ID {{ item.id }}</text></view>
        <view class="card-item__actions">
          <view class="act-btn" @click="openEdit(item)">编辑</view>
          <view class="act-btn danger" @click="confirmRemove(item)">删除</view>
        </view>
      </view>
    </StateView>

    <!-- 编辑弹层 -->
    <view v-if="editItem" class="modal-mask" @click="tryCloseEdit">
      <view class="modal-box" @click.stop>
        <view class="modal-title">{{ editItem.id ? '编辑分类' : '新建分类' }}</view>
        <view class="modal-close" @click.stop="tryCloseEdit">×</view>
        <view class="form-row">
          <text class="form-label">名称<text class="required-mark">*</text></text>
          <view class="form-field">
            <input
              v-model="editForm.name"
              class="form-input"
              :class="{ 'form-input--error': errors.name }"
              placeholder="分类名称"
              @input="formDirty = true"
              @blur="validateField('name')"
            />
            <text v-if="errors.name" class="form-error">{{ errors.name }}</text>
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">图标URL</text>
          <view class="form-field">
            <input v-model="editForm.icon" class="form-input" placeholder="图标地址" @input="formDirty = true" />
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">排序</text>
          <view class="form-field">
            <input v-model="editForm.sort_order" class="form-input" type="number" placeholder="数字越小越靠前" @input="formDirty = true" />
          </view>
        </view>
        <view class="modal-btn" :class="{ disabled: saving }" @click="save">{{ saving ? '保存中...' : '保存' }}</view>
      </view>
    </view>

    <ConfirmDialog
      v-model:visible="confirmVisible"
      title="删除确认"
      :content="`确认删除分类「${confirmItem?.name}」？`"
      desc="删除后不可恢复"
      confirm-text="删除"
      tone="danger"
      @confirm="doRemove"
    />
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/admin/adminApi';
import SearchBar from '@/components/SearchBar.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import StateView from '@/components/StateView.vue';

const list = ref([]);
const loading = ref(false);
const keywordInput = ref('');
const editItem = ref(null);
const editForm = ref({});
const errors = reactive({ name: '' });
const confirmVisible = ref(false);
const confirmItem = ref(null);
const saving = ref(false);
const formDirty = ref(false);

async function fetchList() {
  loading.value = true;
  try {
    const res = await adminApi.getCategories({ page: 1, pageSize: 100, keyword: keywordInput.value || undefined });
    list.value = res.list || [];
  } catch (e) {
    uni.showToast({ title: e.message || '获取失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

onShow(() => fetchList());

function onSearch() { fetchList(); }
function onClear() { fetchList(); }

function openNew() {
  editItem.value = { id: null };
  editForm.value = { name: '', icon: '', sort_order: '0' };
  errors.name = '';
  formDirty.value = false;
}
function openEdit(item) {
  editItem.value = item;
  editForm.value = {
    name: item.name || '',
    icon: item.icon || '',
    sort_order: String(item.sort_order ?? 0),
  };
  errors.name = '';
  formDirty.value = false;
}
function validateField(field) {
  if (field === 'name') {
    errors.name = editForm.value.name && editForm.value.name.trim() ? '' : '名称不能为空';
  }
}
async function save() {
  validateField('name');
  if (errors.name) {
    uni.showToast({ title: errors.name, icon: 'none' });
    return;
  }
  const body = {
    name: editForm.value.name,
    icon: editForm.value.icon,
    sort_order: Number(editForm.value.sort_order) || 0,
  };
  saving.value = true;
  try {
    if (editItem.value.id) {
      await adminApi.updateCategory(editItem.value.id, body);
    } else {
      await adminApi.createCategory(body);
    }
    uni.showToast({ title: '保存成功', icon: 'success' });
    formDirty.value = false;
    editItem.value = null;
    fetchList();
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
function confirmRemove(item) {
  confirmItem.value = item;
  confirmVisible.value = true;
}
async function doRemove() {
  if (!confirmItem.value) return;
  try {
    await adminApi.deleteCategory(confirmItem.value.id);
    uni.showToast({ title: '已删除', icon: 'success', duration: 2000 });
    confirmItem.value = null;
    fetchList();
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
.card-item { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.card-item__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.cat-title { display: flex; align-items: center; }
.cat-icon { width: 48rpx; height: 48rpx; border-radius: 8rpx; margin-right: 12rpx; background: #F2F4F5; }
.card-item__title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; }
.card-item__sub { font-size: 22rpx; color: #666666; }
.card-item__info { font-size: 24rpx; color: #555555; margin-bottom: 8rpx; }
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
.modal-mask { animation: mask-fade-in 200ms ease-out; }
.modal-box { animation: sheet-slide-up 250ms cubic-bezier(0.32, 0.72, 0, 1); }
.modal-close { position: absolute; top: 16rpx; right: 24rpx; width: 56rpx; height: 56rpx; line-height: 56rpx; text-align: center; font-size: 36rpx; color: #999; z-index: 1; }
@keyframes mask-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes sheet-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
</style>
