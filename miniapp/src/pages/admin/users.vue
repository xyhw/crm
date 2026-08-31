<template>
  <view class="admin-list-page">
    <view class="filter-bar">
      <input
        v-model="keywordInput"
        class="filter-input"
        placeholder="搜索手机号/昵称"
        confirm-type="search"
        @confirm="applyFilter"
      />
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

    <view v-if="loading && list.length === 0" class="empty">加载中...</view>
    <view v-else-if="list.length === 0" class="empty">暂无数据</view>
    <view v-else>
      <view v-for="item in list" :key="item.id" class="card-item">
        <view class="card-item__head">
          <text class="card-item__title">{{ item.nickname || item.phone }}</text>
          <text class="status-tag" :class="item.status === 'active' ? 'tone-verified' : 'tone-hot'">{{ item.status === 'active' ? '正常' : '禁用' }}</text>
        </view>
        <view class="card-item__info">
          <text>{{ item.phone }}</text>
          <text>{{ item.company || '-' }}</text>
        </view>
        <view class="card-item__info">
          <text>积分 {{ item.points_balance || 0 }} · {{ levelName(item.level) }}</text>
          <text>信用 {{ item.credit_score || 0 }}</text>
        </view>
        <view class="card-item__info">
          <text>注册时间</text>
          <text>{{ formatDate(item.created_at) }}</text>
        </view>
        <view class="card-item__actions">
          <view class="act-btn" @click.stop="openEdit(item)">编辑</view>
          <view class="act-btn" @click.stop="openAdjust(item, 'points')">积分</view>
          <view class="act-btn" @click.stop="openAdjust(item, 'credit')">信用</view>
          <view class="act-btn danger" @click.stop="toggleStatus(item)">{{ item.status === 'active' ? '禁用' : '启用' }}</view>
        </view>
      </view>

      <view v-if="pageCount > 1" class="pager">
        <view class="pager-btn" :class="{ disabled: page <= 1 }" @click="goPage(page - 1)">上一页</view>
        <text class="pager-info">{{ page }} / {{ pageCount }}</text>
        <view class="pager-btn" :class="{ disabled: page >= pageCount }" @click="goPage(page + 1)">下一页</view>
      </view>
      <view class="pager-total">共 {{ total }} 条</view>
    </view>

    <!-- 编辑用户 -->
    <view v-if="editUser" class="modal-mask" @click="editUser = null">
      <view class="modal-box" @click.stop>
        <view class="modal-title">编辑用户</view>
        <view class="form-row">
          <text class="form-label">昵称</text>
          <input v-model="editForm.nickname" class="form-input" placeholder="昵称" />
        </view>
        <view class="form-row">
          <text class="form-label">公司</text>
          <input v-model="editForm.company" class="form-input" placeholder="公司" />
        </view>
        <view class="modal-btn" @click="submitEdit">保存</view>
      </view>
    </view>

    <!-- 调整积分/信用 -->
    <view v-if="adjustUser" class="modal-mask" @click="adjustUser = null">
      <view class="modal-box" @click.stop>
        <view class="modal-title">调整{{ adjustType === 'points' ? '积分' : '信用分' }} - {{ adjustUser.nickname || adjustUser.phone }}</view>
        <view class="form-row">
          <text class="form-label">调整数值</text>
          <input v-model="adjustForm.delta" class="form-input" type="number" placeholder="正数增加/负数减少" />
        </view>
        <view class="form-row">
          <text class="form-label">调整原因</text>
          <input v-model="adjustForm.reason" class="form-input" :placeholder="adjustType === 'points' ? '例如：活动奖励' : '例如：违规扣除'" />
        </view>
        <view class="modal-btn" @click="submitAdjust">提交</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/admin/adminApi';
import { formatDate, levelName } from '@/common/constants';

const list = ref([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = 10;
const keywordInput = ref('');
const status = ref('');
const editUser = ref(null);
const editForm = ref({ nickname: '', company: '' });
const adjustUser = ref(null);
const adjustType = ref('points');
const adjustForm = ref({ delta: '', reason: '' });

const statusOptions = [
  { label: '全部', value: '' },
  { label: '正常', value: 'active' },
  { label: '禁用', value: 'banned' },
];

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

async function fetchList(p = 1) {
  loading.value = true;
  try {
    const res = await adminApi.getUsers({
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

function applyFilter() { fetchList(1); }
function selectStatus(s) { status.value = s; fetchList(1); }
function goPage(p) {
  if (p < 1 || p > pageCount.value || p === page.value) return;
  fetchList(p);
}

function openEdit(item) {
  editUser.value = item;
  editForm.value = { nickname: item.nickname || '', company: item.company || '' };
}
async function submitEdit() {
  try {
    await adminApi.updateUser(editUser.value.id, editForm.value);
    uni.showToast({ title: '更新成功', icon: 'success' });
    editUser.value = null;
    fetchList(page.value);
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  }
}

function openAdjust(item, type) {
  adjustType.value = type;
  adjustUser.value = item;
  adjustForm.value = { delta: '', reason: '' };
}
async function submitAdjust() {
  const delta = Number(adjustForm.value.delta);
  if (!delta && delta !== 0) {
    uni.showToast({ title: '请输入调整数值', icon: 'none' });
    return;
  }
  const body = {
    delta,
    reason: adjustForm.value.reason || (adjustType.value === 'points' ? '管理员调整积分' : '管理员调整信用分'),
  };
  try {
    if (adjustType.value === 'points') {
      await adminApi.adjustPoints(adjustUser.value.id, body);
    } else {
      await adminApi.adjustCredit(adjustUser.value.id, body);
    }
    uni.showToast({ title: '调整成功', icon: 'success' });
    adjustUser.value = null;
    fetchList(page.value);
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  }
}

async function toggleStatus(item) {
  const newStatus = item.status === 'active' ? 'banned' : 'active';
  const label = newStatus === 'banned' ? '禁用' : '启用';
  uni.showModal({
    title: '提示',
    content: `确认${label}该用户？`,
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await adminApi.updateUser(item.id, { status: newStatus });
        uni.showToast({ title: '状态已更新', icon: 'success' });
        fetchList(page.value);
      } catch (e) {
        uni.showToast({ title: e.message, icon: 'none' });
      }
    },
  });
}
</script>

<style lang="scss" scoped>
.admin-list-page {
  min-height: 100vh;
  background: #F2F4F5;
  padding: 16rpx 24rpx;
}
.filter-bar { margin-bottom: 16rpx; }
.filter-input {
  height: 72rpx;
  background: #fff;
  border-radius: 36rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
  margin-bottom: 16rpx;
}
.filter-tabs { display: flex; flex-wrap: wrap; }
.filter-tab {
  padding: 8rpx 24rpx;
  margin-right: 16rpx;
  margin-bottom: 12rpx;
  border-radius: 28rpx;
  font-size: 24rpx;
  color: #7A7A7A;
  background: #fff;
}
.filter-tab.active { color: #fff; background: #048C47; }
.card-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.card-item__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.card-item__title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; flex: 1; margin-right: 16rpx; }
.status-tag { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; color: #7A7A7A; background: #F2F4F5; }
.tone-verified { color: #048C47; background: #E4F7EC; }
.tone-hot { color: #E54848; background: #FDECEC; }
.card-item__info { display: flex; justify-content: space-between; font-size: 24rpx; color: #7A7A7A; margin-bottom: 8rpx; }
.card-item__actions { display: flex; justify-content: flex-end; margin-top: 12rpx; gap: 16rpx; }
.act-btn {
  padding: 8rpx 28rpx;
  border-radius: 32rpx;
  border: 1px solid #048C47;
  color: #048C47;
  font-size: 24rpx;
}
.act-btn.danger { border-color: #E54848; color: #E54848; }
.pager { display: flex; align-items: center; justify-content: center; padding: 16rpx 0; }
.pager-btn { padding: 8rpx 28rpx; border: 1px solid #DDD; border-radius: 8rpx; font-size: 26rpx; color: #333; background: #fff; }
.pager-btn.disabled { color: #C0C0C0; border-color: #EEE; background: #F7F8F9; }
.pager-info { margin: 0 24rpx; font-size: 26rpx; color: #333; }
.pager-total { text-align: center; font-size: 24rpx; color: #B0B0B0; padding-bottom: 16rpx; }
.modal-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 999; display: flex; align-items: flex-end; }
.modal-box { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom)); max-height: 80vh; overflow-y: auto; }
.modal-title { font-size: 32rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 24rpx; text-align: center; }
.form-row { display: flex; align-items: center; padding: 12rpx 0; }
.form-label { width: 160rpx; font-size: 26rpx; color: #7A7A7A; flex-shrink: 0; }
.form-input { flex: 1; height: 72rpx; background: #F7F8F9; border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; }
.modal-btn { margin-top: 32rpx; height: 80rpx; line-height: 80rpx; text-align: center; background: #048C47; color: #fff; border-radius: 40rpx; font-size: 28rpx; }
</style>