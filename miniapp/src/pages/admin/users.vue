<template>
  <view class="admin-list-page">
    <view class="filter-bar">
      <SearchBar v-model="keywordInput" placeholder="搜索手机号/昵称" @search="onSearch" @clear="onClear" />
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
      empty-title="暂无用户"
      empty-desc="暂无符合条件的用户数据"
      :skeleton-count="4"
    >
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
          <view class="act-btn danger" @click.stop="confirmToggleStatus(item)">{{ item.status === 'active' ? '禁用' : '启用' }}</view>
        </view>
      </view>
    </StateView>

    <Pagination :page="page" :page-count="pageCount" :total="total" @change="goPage" />

    <!-- 编辑用户 -->
    <view v-if="editUser" class="modal-mask" @click="tryCloseEdit">
      <view class="modal-box" @click.stop>
        <view class="modal-title">编辑用户</view>
        <view class="modal-close" @click.stop="tryCloseEdit">×</view>
        <view class="form-row">
          <text class="form-label">昵称</text>
          <view class="form-field">
            <input
              v-model="editForm.nickname"
              class="form-input"
              :class="{ 'form-input--error': errors.nickname }"
              placeholder="昵称"
              @input="formDirty = true"
              @blur="validateField('nickname')"
            />
            <text v-if="errors.nickname" class="form-error">{{ errors.nickname }}</text>
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">公司</text>
          <view class="form-field">
            <input v-model="editForm.company" class="form-input" placeholder="公司" @input="formDirty = true" />
          </view>
        </view>
        <view class="modal-btn" @click="submitEdit">保存</view>
      </view>
    </view>

    <!-- 调整积分/信用 -->
    <view v-if="adjustUser" class="modal-mask" @click="tryCloseAdjust">
      <view class="modal-box" @click.stop>
        <view class="modal-title">调整{{ adjustType === 'points' ? '积分' : '信用分' }} - {{ adjustUser.nickname || adjustUser.phone }}</view>
        <view class="modal-close" @click.stop="tryCloseAdjust">×</view>
        <view class="form-row">
          <text class="form-label">调整数值</text>
          <view class="form-field">
            <input
              v-model="adjustForm.delta"
              class="form-input"
              :class="{ 'form-input--error': errors.delta }"
              type="number"
              placeholder="正数增加/负数减少"
              @input="formDirty = true"
              @blur="validateField('delta')"
            />
            <text v-if="errors.delta" class="form-error">{{ errors.delta }}</text>
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">调整原因</text>
          <view class="form-field">
            <input v-model="adjustForm.reason" class="form-input" :placeholder="adjustType === 'points' ? '例如：活动奖励' : '例如：违规扣除'" @input="formDirty = true" />
          </view>
        </view>
        <view class="modal-btn" @click="submitAdjust">提交</view>
      </view>
    </view>

    <ConfirmDialog
      v-model:visible="confirmDisableVisible"
      title="操作确认"
      :content="`确认${confirmDisableItem?.status === 'active' ? '禁用' : '启用'}用户「${confirmDisableItem?.nickname || confirmDisableItem?.phone}」？`"
      desc="状态变更后将影响该用户的登录和使用"
      confirm-text="确定"
      tone="danger"
      @confirm="doToggleStatus"
    />
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/admin/adminApi';
import { formatDate, levelName } from '@/common/constants';
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
const editUser = ref(null);
const editForm = ref({ nickname: '', company: '' });
const adjustUser = ref(null);
const adjustType = ref('points');
const adjustForm = ref({ delta: '', reason: '' });
const errors = reactive({ nickname: '', delta: '' });
const confirmDisableVisible = ref(false);
const confirmDisableItem = ref(null);
const formDirty = ref(false);

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

function onSearch() { fetchList(1); }
function onClear() { fetchList(1); }
function applyFilter() { fetchList(1); }
function selectStatus(s) { status.value = s; fetchList(1); }
function goPage(p) {
  if (p < 1 || p > pageCount.value || p === page.value) return;
  fetchList(p);
}

function openEdit(item) {
  editUser.value = item;
  editForm.value = { nickname: item.nickname || '', company: item.company || '' };
  errors.nickname = '';
  formDirty.value = false;
}
function validateField(field) {
  if (field === 'nickname') {
    errors.nickname = editForm.value.nickname && editForm.value.nickname.trim() ? '' : '昵称不能为空';
  } else if (field === 'delta') {
    const d = Number(adjustForm.value.delta);
    errors.delta = (adjustForm.value.delta === '' || Number.isNaN(d)) ? '请输入调整数值' : '';
  }
}
async function submitEdit() {
  validateField('nickname');
  if (errors.nickname) {
    uni.showToast({ title: errors.nickname, icon: 'none' });
    return;
  }
  try {
    await adminApi.updateUser(editUser.value.id, editForm.value);
    uni.showToast({ title: '更新成功', icon: 'success' });
    formDirty.value = false;
    editUser.value = null;
    fetchList(page.value);
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
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
          editUser.value = null;
        }
      },
    });
  } else {
    editUser.value = null;
  }
}

function openAdjust(item, type) {
  adjustType.value = type;
  adjustUser.value = item;
  adjustForm.value = { delta: '', reason: '' };
  errors.delta = '';
  formDirty.value = false;
}
async function submitAdjust() {
  validateField('delta');
  if (errors.delta) {
    uni.showToast({ title: errors.delta, icon: 'none' });
    return;
  }
  const delta = Number(adjustForm.value.delta);
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
    formDirty.value = false;
    adjustUser.value = null;
    fetchList(page.value);
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  }
}
function tryCloseAdjust() {
  if (formDirty.value) {
    uni.showModal({
      title: '提示',
      content: '表单有未保存的修改，确认关闭？',
      success: (res) => {
        if (res.confirm) {
          formDirty.value = false;
          adjustUser.value = null;
        }
      },
    });
  } else {
    adjustUser.value = null;
  }
}

function confirmToggleStatus(item) {
  confirmDisableItem.value = item;
  confirmDisableVisible.value = true;
}
async function doToggleStatus() {
  if (!confirmDisableItem.value) return;
  const item = confirmDisableItem.value;
  const newStatus = item.status === 'active' ? 'banned' : 'active';
  try {
    await adminApi.updateUser(item.id, { status: newStatus });
    uni.showToast({ title: '状态已更新', icon: 'success' });
    confirmDisableItem.value = null;
    fetchList(page.value);
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  }
}
</script>

<style lang="scss" scoped>
.admin-list-page {
  touch-action: manipulation;
  min-height: 100dvh;
  background: #F2F4F5;
  padding: 16rpx 24rpx 140rpx;
}
.filter-bar { margin-bottom: 16rpx; }
.filter-tabs { display: flex; flex-wrap: wrap; margin-top: 16rpx; }
.filter-tab {
  min-height: 88rpx; line-height: 72rpx; padding: 0 24rpx;
  margin-right: 16rpx;
  margin-bottom: 12rpx;
  border-radius: 28rpx;
  font-size: 24rpx;
  color: #555555;
  background: #fff;
}
.filter-tab.active { color: #fff; background: #037539; }
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
.status-tag { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; color: #555555; background: #F2F4F5; }
.tone-verified { color: #037539; background: #E4F7EC; }
.tone-hot { color: #E54848; background: #FDECEC; }
.card-item__info { display: flex; justify-content: space-between; font-size: 24rpx; color: #555555; margin-bottom: 8rpx; }
.card-item__actions { display: flex; justify-content: flex-end; margin-top: 12rpx; gap: 16rpx; }
.act-btn {
  min-height: 88rpx; line-height: 88rpx; padding: 0 24rpx;
  border-radius: 32rpx;
  border: 1px solid #037539;
  color: #037539;
  font-size: 24rpx;
}
.act-btn.danger { border-color: #E54848; color: #E54848; }
.modal-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 999; display: flex; align-items: flex-end; }
.modal-box { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom)); max-height: 80vh; overflow-y: auto; position: relative; }
.modal-title { font-size: 32rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 24rpx; text-align: center; }
.form-row { display: flex; align-items: flex-start; padding: 12rpx 0; }
.form-label { width: 160rpx; font-size: 26rpx; color: #555555; flex-shrink: 0; line-height: 72rpx; }
.form-field { flex: 1; }
.form-input { width: 100%; height: 72rpx; background: #F7F8F9; border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; box-sizing: border-box; border: 1px solid transparent; }
.form-input:focus { border-color: #037539; background: #fff; }
.form-input--error { border-color: #E54848; background: #FEF2F2; }
.form-error { display: block; font-size: 22rpx; color: #E54848; margin-top: 8rpx; padding-left: 8rpx; }
.modal-btn { margin-top: 32rpx; height: 88rpx; line-height: 88rpx; text-align: center; background: #037539; color: #fff; border-radius: 40rpx; font-size: 28rpx; }
.modal-mask { animation: mask-fade-in 200ms ease-out; }
.modal-box { animation: sheet-slide-up 250ms cubic-bezier(0.32, 0.72, 0, 1); }
.modal-close { position: absolute; top: 16rpx; right: 24rpx; width: 56rpx; height: 56rpx; line-height: 56rpx; text-align: center; font-size: 36rpx; color: #999; z-index: 1; }
@keyframes mask-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes sheet-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
</style>
