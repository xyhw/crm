<template>
  <view class="admin-list-page">
    <view class="page-head">
      <text class="page-title">通知推送</text>
      <view class="head-actions">
        <text class="refresh-btn" @click="fetchList(page)">刷新</text>
        <view class="add-btn" @click="openSend">发送通知</view>
      </view>
    </view>

    <StateView
      :loading="loading"
      :empty="!loading && list.length === 0"
      empty-title="暂无推送记录"
      empty-desc="暂无通知推送记录"
      :skeleton-count="4"
    >
      <view v-for="(item, i) in list" :key="item.id || item.sent_time || i" class="card-item">
        <view class="card-item__head">
          <text class="card-item__title">{{ item.title }}</text>
          <text class="status-tag">接收 {{ item.recipient_count || 0 }} 人</text>
        </view>
        <view class="card-item__detail">{{ item.content }}</view>
        <view class="card-item__info"><text>{{ formatDate(item.sent_time || item.created_at) }}</text></view>
      </view>
    </StateView>

    <Pagination :page="page" :page-count="pageCount" :total="total" @change="goPage" />

    <!-- 发送弹层 -->
    <view v-if="sendOpen" class="modal-mask" @click="tryCloseSend">
      <view class="modal-box" @click.stop>
        <view class="modal-title">发送通知</view>
        <view class="modal-close" @click.stop="tryCloseSend">×</view>
        <view class="form-row">
          <text class="form-label">标题<text class="required-mark">*</text></text>
          <view class="form-field">
            <input
              v-model="sendForm.title"
              class="form-input"
              :class="{ 'form-input--error': errors.title }"
              placeholder="标题"
              @input="formDirty = true"
              @blur="validateField('title')"
            />
            <text v-if="errors.title" class="form-error">{{ errors.title }}</text>
          </view>
        </view>
        <view class="form-row" style="align-items: flex-start;">
          <text class="form-label">内容<text class="required-mark">*</text></text>
          <view class="form-field">
            <textarea
              v-model="sendForm.content"
              class="form-textarea"
              :class="{ 'form-input--error': errors.content }"
              placeholder="通知内容"
              auto-height
              @input="formDirty = true"
              @blur="validateField('content')"
            />
            <text v-if="errors.content" class="form-error">{{ errors.content }}</text>
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">发送范围</text>
          <view class="range-options">
            <view class="perm-option" :class="{ active: sendForm.sendAll }" @click="onRangeChange(true)">全部用户</view>
            <view class="perm-option" :class="{ active: !sendForm.sendAll }" @click="onRangeChange(false)">指定用户</view>
          </view>
        </view>
        <view v-if="!sendForm.sendAll" class="form-row" style="align-items: flex-start;">
          <text class="form-label">用户ID<text class="required-mark">*</text></text>
          <textarea v-model="sendForm.userIds" class="form-textarea" placeholder="多个ID用逗号分隔" auto-height @input="formDirty = true" />
        </view>
        <view class="modal-btn" :class="{ disabled: sending }" @click="send">{{ sending ? '发送中...' : '发送' }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/admin/adminApi';
import { formatDate } from '@/common/constants';
import Pagination from '@/components/Pagination.vue';
import StateView from '@/components/StateView.vue';

const list = ref([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = 10;
const sendOpen = ref(false);
const sending = ref(false);
const sendForm = ref({ title: '', content: '', sendAll: true, userIds: '' });
const errors = reactive({ title: '', content: '' });
const formDirty = ref(false);

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

async function fetchList(p = 1) {
  loading.value = true;
  try {
    const res = await adminApi.getNotificationHistory({ page: p, pageSize });
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
function goPage(p) {
  if (p < 1 || p > pageCount.value || p === page.value) return;
  fetchList(p);
}

function openSend() {
  sendForm.value = { title: '', content: '', sendAll: true, userIds: '' };
  errors.title = '';
  errors.content = '';
  formDirty.value = false;
  sendOpen.value = true;
}
function onRangeChange(all) {
  sendForm.value.sendAll = all;
  formDirty.value = true;
}
function validateField(field) {
  if (field === 'title') {
    errors.title = sendForm.value.title && sendForm.value.title.trim() ? '' : '标题不能为空';
  } else if (field === 'content') {
    errors.content = sendForm.value.content && sendForm.value.content.trim() ? '' : '内容不能为空';
  }
}
async function send() {
  validateField('title');
  validateField('content');
  if (errors.title || errors.content) {
    uni.showToast({ title: errors.title || errors.content, icon: 'none' });
    return;
  }
  if (sendForm.value.title.length > 100) {
    uni.showToast({ title: '标题不能超过100字', icon: 'none' });
    return;
  }
  if (sendForm.value.content.length > 500) {
    uni.showToast({ title: '内容不能超过500字', icon: 'none' });
    return;
  }
  if (!sendForm.value.sendAll && !sendForm.value.userIds.trim()) {
    uni.showToast({ title: '请输入用户ID', icon: 'none' });
    return;
  }
  sending.value = true;
  try {
    const data = {
      title: sendForm.value.title,
      content: sendForm.value.content,
      sendAll: sendForm.value.sendAll,
    };
    if (!sendForm.value.sendAll) {
      data.userIds = sendForm.value.userIds
        .split(/[,，\s]+/)
        .map((s) => Number(s.trim()))
        .filter(Boolean);
    }
    await adminApi.sendNotification(data);
    uni.showToast({ title: '发送成功', icon: 'success' });
    formDirty.value = false;
    sendOpen.value = false;
    fetchList(1);
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  } finally {
    sending.value = false;
  }
}
function tryCloseSend() {
  if (formDirty.value) {
    uni.showModal({
      title: '提示',
      content: '表单有未保存的修改，确认关闭？',
      success: (res) => {
        if (res.confirm) {
          formDirty.value = false;
          sendOpen.value = false;
        }
      },
    });
  } else {
    sendOpen.value = false;
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
.card-item { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.card-item__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.card-item__title { font-size: 28rpx; font-weight: 600; color: #1A1A1A; flex: 1; margin-right: 12rpx; }
.status-tag { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; color: #037539; background: #E4F7EC; flex-shrink: 0; }
.card-item__detail { font-size: 24rpx; color: #555; background: #F7F8F9; border-radius: 8rpx; padding: 12rpx; margin-bottom: 8rpx; }
.card-item__info { display: flex; justify-content: flex-end; font-size: 24rpx; color: #666666; }
.modal-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 999; display: flex; align-items: flex-end; }
.modal-box { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom)); max-height: 85vh; overflow-y: auto; position: relative; }
.modal-title { font-size: 32rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 24rpx; text-align: center; }
.form-row { display: flex; align-items: center; padding: 12rpx 0; }
.form-label { width: 150rpx; font-size: 26rpx; color: #555555; flex-shrink: 0; }
.form-field { flex: 1; }
.form-input { width: 100%; height: 72rpx; background: #F7F8F9; border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; box-sizing: border-box; border: 1px solid transparent; }
.form-input:focus { border-color: #037539; background: #fff; }
.form-textarea { width: 100%; min-height: 120rpx; background: #F7F8F9; border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 26rpx; box-sizing: border-box; border: 1px solid transparent; }
.form-input--error { border-color: #E54848; background: #FEF2F2; }
.form-error { display: block; font-size: 22rpx; color: #E54848; margin-top: 8rpx; padding-left: 8rpx; }
.range-options { flex: 1; display: flex; }
.perm-option { font-size: 22rpx; min-height: 72rpx; line-height: 72rpx; padding: 0 24rpx; border-radius: 24rpx; border: 1px solid #CCC; color: #555; margin-right: 16rpx; }
.perm-option.active { border-color: #037539; color: #037539; background: #E4F7EC; }
.modal-btn { margin-top: 32rpx; height: 88rpx; line-height: 88rpx; text-align: center; background: #037539; color: #fff; border-radius: 40rpx; font-size: 28rpx; }
.modal-btn.disabled { opacity: 0.6; }
.required-mark { color: #E54848; margin-left: 4rpx; }
.modal-mask { animation: mask-fade-in 200ms ease-out; }
.modal-box { animation: sheet-slide-up 250ms cubic-bezier(0.32, 0.72, 0, 1); }
.modal-close { position: absolute; top: 16rpx; right: 24rpx; width: 56rpx; height: 56rpx; line-height: 56rpx; text-align: center; font-size: 36rpx; color: #999; z-index: 1; }
@keyframes mask-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes sheet-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
</style>
