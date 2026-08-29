<template>
  <view class="admin-list-page">
    <view class="page-head">
      <text class="page-title">分类管理</text>
      <view class="add-btn" @click="openNew">新建分类</view>
    </view>

    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="list.length === 0" class="empty">暂无数据</view>
    <view v-else>
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
          <view class="act-btn danger" @click="remove(item)">删除</view>
        </view>
      </view>
    </view>

    <!-- 编辑弹层 -->
    <view v-if="editItem" class="modal-mask" @click="editItem = null">
      <view class="modal-box" @click.stop>
        <view class="modal-title">{{ editItem.id ? '编辑分类' : '新建分类' }}</view>
        <view class="form-row">
          <text class="form-label">名称</text>
          <input v-model="editForm.name" class="form-input" placeholder="分类名称" />
        </view>
        <view class="form-row">
          <text class="form-label">图标URL</text>
          <input v-model="editForm.icon" class="form-input" placeholder="图标地址" />
        </view>
        <view class="form-row">
          <text class="form-label">排序</text>
          <input v-model="editForm.sort_order" class="form-input" type="number" placeholder="数字越小越靠前" />
        </view>
        <view class="modal-btn" @click="save">保存</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/admin/adminApi';

const list = ref([]);
const loading = ref(false);
const editItem = ref(null);
const editForm = ref({});

async function fetchList() {
  loading.value = true;
  try {
    const res = await adminApi.getCategories({ page: 1, pageSize: 100 });
    list.value = res.list || [];
  } catch (e) {
    uni.showToast({ title: e.message || '获取失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

onShow(() => fetchList());

function openNew() {
  editItem.value = { id: null };
  editForm.value = { name: '', icon: '', sort_order: '0' };
}
function openEdit(item) {
  editItem.value = item;
  editForm.value = {
    name: item.name || '',
    icon: item.icon || '',
    sort_order: String(item.sort_order ?? 0),
  };
}
async function save() {
  const body = {
    name: editForm.value.name,
    icon: editForm.value.icon,
    sort_order: Number(editForm.value.sort_order) || 0,
  };
  if (!body.name) {
    uni.showToast({ title: '名称不能为空', icon: 'none' });
    return;
  }
  try {
    if (editItem.value.id) {
      await adminApi.updateCategory(editItem.value.id, body);
    } else {
      await adminApi.createCategory(body);
    }
    uni.showToast({ title: '保存成功', icon: 'success' });
    editItem.value = null;
    fetchList();
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  }
}
function remove(item) {
  uni.showModal({
    title: '提示',
    content: `确认删除分类「${item.name}」？`,
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await adminApi.deleteCategory(item.id);
        uni.showToast({ title: '已删除', icon: 'success' });
        fetchList();
      } catch (e) {
        uni.showToast({ title: e.message, icon: 'none' });
      }
    },
  });
}
</script>

<style lang="scss" scoped>
.admin-list-page { min-height: 100vh; background: #F2F4F5; padding: 16rpx 24rpx; }
.page-head { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; }
.page-title { font-size: 32rpx; font-weight: 700; color: #1A1A1A; }
.add-btn { font-size: 24rpx; color: #048C47; padding: 6rpx 24rpx; border: 1px solid #048C47; border-radius: 28rpx; }
.card-item { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.card-item__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.cat-title { display: flex; align-items: center; }
.cat-icon { width: 48rpx; height: 48rpx; border-radius: 8rpx; margin-right: 12rpx; background: #F2F4F5; }
.card-item__title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; }
.card-item__sub { font-size: 22rpx; color: #B0B0B0; }
.card-item__info { font-size: 24rpx; color: #7A7A7A; margin-bottom: 8rpx; }
.card-item__actions { display: flex; justify-content: flex-end; margin-top: 12rpx; gap: 16rpx; }
.act-btn { padding: 8rpx 28rpx; border-radius: 32rpx; border: 1px solid #048C47; color: #048C47; font-size: 24rpx; }
.act-btn.danger { border-color: #E54848; color: #E54848; }
.modal-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 999; display: flex; align-items: flex-end; }
.modal-box { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom)); max-height: 85vh; overflow-y: auto; }
.modal-title { font-size: 32rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 24rpx; text-align: center; }
.form-row { display: flex; align-items: center; padding: 12rpx 0; }
.form-label { width: 140rpx; font-size: 26rpx; color: #7A7A7A; flex-shrink: 0; }
.form-input { flex: 1; height: 72rpx; background: #F7F8F9; border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; }
.modal-btn { margin-top: 32rpx; height: 80rpx; line-height: 80rpx; text-align: center; background: #048C47; color: #fff; border-radius: 40rpx; font-size: 28rpx; }
</style>