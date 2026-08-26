<template>
  <view v-if="intelligence && intelligence.totalShares > 0" class="mi-block">
    <view class="mi-summary">{{ intelligence.totalShares }} 位购买者共享了进度</view>

    <view v-if="hasDistribution" class="mi-status-row">
      <text
        v-for="(count, key) in intelligence.statusDistribution"
        :key="key"
        class="mi-status-pill"
      >
        {{ followUpStatusLabel(key) }} {{ count }}
      </text>
    </view>

    <view v-if="visible.length" class="mi-board">
      <view class="mi-board-title">共享进度榜</view>
      <view
        v-for="(s, idx) in visible"
        :key="s.shareId"
        class="mi-share-item"
        :class="{ own: s.isOwn }"
      >
        <view class="mi-share-rank">{{ (page - 1) * pageSize + idx + 1 }}</view>
        <view class="mi-share-main">
          <view class="mi-share-row">
            <text class="mi-share-status" :style="statusStyleOf(s.status)">{{ followUpStatusLabel(s.status) }}</text>
            <text class="mi-share-user">{{ s.isOwn ? '我' : maskName(s.nickname) }}</text>
            <text class="mi-share-time">{{ timeAgo(s.createdAt) }}</text>
          </view>
          <view v-if="s.summary" class="mi-share-summary">{{ s.summary }}</view>
        </view>
        <view class="mi-actions">
          <view
            v-if="!s.isOwn"
            class="mi-report-btn"
            :class="{ reported: s.isReported }"
            @click="openReport(s)"
          >
            <text>{{ s.isReported ? '已举报' : s.reportCount > 0 ? `无效 ${s.reportCount}` : '无效' }}</text>
          </view>
          <view
            class="mi-like-btn"
            :class="{ liked: s.isLiked, disabled: s.isOwn }"
            @click="handleLike(s)"
          >
            <text>{{ s.helpfulCount || 0 }}</text>
          </view>
        </view>
      </view>
      <view v-if="totalPages > 1" class="mi-pagination">
        <view class="page-btn" :class="{ disabled: page <= 1 }" @click="prevPage">上一页</view>
        <view class="page-info">{{ page }} / {{ totalPages }}</view>
        <view class="page-btn" :class="{ disabled: page >= totalPages }" @click="nextPage">下一页</view>
      </view>
    </view>

    <view v-if="!hasDistribution && !visible.length" class="mi-empty">暂无共享进度</view>

    <!-- 举报弹窗 -->
    <view v-if="reporting !== null" class="modal-mask" @click.self="reporting = null">
      <view class="modal">
        <view class="modal-title">举报无效情报</view>
        <view class="dialog-body">
          <view class="dialog-label">举报原因：</view>
          <view class="reason-chips">
            <view
              v-for="r in SHARE_INVALID_REASONS"
              :key="r.value"
              class="reason-chip"
              :class="{ active: reportReason === r.value }"
              @click="reportReason = r.value"
            >
              {{ r.label }}
            </view>
          </view>
          <textarea
            v-model="reportText"
            class="reason-input"
            placeholder="补充说明（选填）"
            :maxlength="200"
          />
          <view class="dialog-tip">多次被举报的情报将自动下架。</view>
        </view>
        <view class="modal-actions">
          <view class="modal-btn" @click="reporting = null">取消</view>
          <view class="modal-btn modal-btn--primary" :class="{ disabled: reportingId }" @click="handleReport">
            {{ reportingId ? '提交中' : '提交' }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { api } from '@/api/index';
import { SHARE_INVALID_REASONS, FOLLOW_UP_STATUS_META, maskName, timeAgo, followUpStatusLabel } from '@/common/constants';

const props = defineProps({
  intelligence: { type: Object, default: () => null },
});
const emit = defineEmits(['changed']);

const pageSize = 6;
const page = ref(1);

const hasDistribution = computed(() => props.intelligence && Object.keys(props.intelligence.statusDistribution || {}).length > 0);
const board = computed(() => props.intelligence?.shareBoard || []);
const totalPages = computed(() => Math.max(1, Math.ceil(board.value.length / pageSize)));
const visible = computed(() => board.value.slice((page.value - 1) * pageSize, page.value * pageSize));

function statusStyleOf(value) {
  const meta = FOLLOW_UP_STATUS_META[value] || FOLLOW_UP_STATUS_META.call_no_answer;
  return { color: meta.color, background: meta.bg };
}

function prevPage() {
  if (page.value > 1) page.value -= 1;
}

function nextPage() {
  if (page.value < totalPages.value) page.value += 1;
}

async function handleLike(s) {
  if (s.isOwn || s.isLiked || s._liking) return;
  s._liking = true;
  try {
    await api.markHelpful({ shareId: s.shareId });
    s.isLiked = true;
    s.helpfulCount = (s.helpfulCount || 0) + 1;
    uni.showToast({ title: '点赞成功', icon: 'none' });
    emit('changed');
  } catch (e) {
    uni.showToast({ title: e.message || '点赞失败', icon: 'none' });
  } finally {
    s._liking = false;
  }
}

const reporting = ref(null);
const reportReason = ref('info_fake');
const reportText = ref('');
const reportingId = ref(null);

function openReport(s) {
  if (s.isReported) return;
  reporting.value = s.shareId;
  reportReason.value = 'info_fake';
  reportText.value = '';
}

async function handleReport() {
  if (reporting.value === null || reportingId.value) return;
  reportingId.value = reporting.value;
  try {
    await api.reportShare({
      shareId: reporting.value,
      reason: reportReason.value,
      reasonText: reportText.value.trim() || undefined,
    });
    uni.showToast({ title: '举报成功', icon: 'none' });
    reporting.value = null;
    emit('changed');
  } catch (e) {
    uni.showToast({ title: e.message || '举报失败', icon: 'none' });
  } finally {
    reportingId.value = null;
  }
}
</script>

<style lang="scss" scoped>
.mi-block {
  margin-top: 8rpx;
}

.mi-summary {
  font-size: 26rpx;
  color: #4A4A4A;
  margin-bottom: 16rpx;
}

.mi-status-row {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 16rpx;
}

.mi-status-pill {
  padding: 4rpx 16rpx;
  margin: 0 12rpx 12rpx 0;
  font-size: 22rpx;
  color: #4A4A4A;
  background: #F2F4F5;
  border-radius: 24rpx;
}

.mi-board-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 12rpx;
}

.mi-share-item {
  display: flex;
  padding: 16rpx 0;
  border-bottom: 1px solid #F2F4F5;
}

.mi-share-item.own {
  background: #E4F7EC;
  margin: 0 -16rpx;
  padding: 16rpx;
  border-radius: 12rpx;
}

.mi-share-rank {
  width: 56rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #B0B0B0;
}

.mi-share-item.own .mi-share-rank {
  color: #048C47;
}

.mi-share-main {
  flex: 1;
  min-width: 0;
}

.mi-share-row {
  display: flex;
  align-items: center;
}

.mi-share-status {
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  margin-right: 12rpx;
}

.mi-share-user {
  font-size: 26rpx;
  color: #1A1A1A;
}

.mi-share-time {
  font-size: 22rpx;
  color: #B0B0B0;
  margin-left: 12rpx;
}

.mi-share-summary {
  font-size: 26rpx;
  color: #4A4A4A;
  line-height: 1.5;
  margin-top: 8rpx;
  word-break: break-word;
}

.mi-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: 16rpx;
}

.mi-report-btn {
  padding: 8rpx 16rpx;
  font-size: 22rpx;
  color: #E54848;
  border: 1px solid #E54848;
  border-radius: 24rpx;
  margin-right: 12rpx;
}

.mi-report-btn.reported {
  color: #B0B0B0;
  border-color: #E0E0E0;
}

.mi-like-btn {
  padding: 8rpx 16rpx;
  font-size: 22rpx;
  color: #7A7A7A;
  background: #F2F4F5;
  border-radius: 24rpx;
}

.mi-like-btn.liked {
  color: #ffffff;
  background: #048C47;
}

.mi-like-btn.disabled {
  opacity: 0.5;
}

.mi-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16rpx 0 4rpx;
}

.page-btn {
  padding: 8rpx 24rpx;
  font-size: 24rpx;
  color: #048C47;
  background: #E4F7EC;
  border-radius: 24rpx;
}

.page-btn.disabled {
  color: #B0B0B0;
  background: #F2F4F5;
}

.page-info {
  margin: 0 24rpx;
  font-size: 24rpx;
  color: #7A7A7A;
}

.mi-empty {
  text-align: center;
  padding: 40rpx 0;
  color: #B0B0B0;
  font-size: 26rpx;
}

/* 弹窗 */
.modal-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 300;
}

.modal {
  width: 100%;
  background: #ffffff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx 24rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
}

.modal-title {
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 24rpx;
}

.dialog-label {
  font-size: 26rpx;
  color: #4A4A4A;
  margin-bottom: 16rpx;
}

.reason-chips {
  display: flex;
  flex-wrap: wrap;
}

.reason-chip {
  padding: 12rpx 28rpx;
  margin: 0 16rpx 16rpx 0;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #7A7A7A;
  background: #F2F4F5;
}

.reason-chip.active {
  color: #ffffff;
  background: #048C47;
}

.reason-input {
  width: 100%;
  box-sizing: border-box;
  height: 120rpx;
  background: #F2F4F5;
  border-radius: 12rpx;
  padding: 16rpx;
  font-size: 26rpx;
  margin-top: 8rpx;
}

.dialog-tip {
  font-size: 22rpx;
  color: #B0B0B0;
  margin-top: 8rpx;
}

.modal-actions {
  display: flex;
  margin-top: 28rpx;
}

.modal-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  border-radius: 40rpx;
  background: #F2F4F5;
  color: #4A4A4A;
  font-size: 30rpx;
  margin-left: 16rpx;
}

.modal-btn:first-child {
  margin-left: 0;
}

.modal-btn--primary {
  background: #048C47;
  color: #ffffff;
}

.modal-btn--primary.disabled {
  opacity: 0.6;
}
</style>