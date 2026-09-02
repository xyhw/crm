<template>
  <view class="crm-detail-page">
    <view v-if="loading" class="loading-tip">加载中...</view>
    <view v-else-if="!detail" class="empty">CRM商机不存在</view>

    <template v-else>
      <!-- 基本信息 -->
      <view class="info-card">
        <view class="info-row">
          <text class="info-label">商机标题</text>
          <text class="info-value">{{ detail.title || '手动录入' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">城市</text>
          <text class="info-value">{{ detail.city || '未知' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">酒店</text>
          <text class="info-value">{{ detail.hotel_name || '未知' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">分类</text>
          <text class="info-value">{{ detail.category_name || '其他' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">状态</text>
          <text class="info-value" :style="statusStyle">{{ crmStatusLabel(detail.status) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">来源</text>
          <text class="info-value">{{ detail.source === 'purchased' ? '购买入库' : '手动录入' }}</text>
        </view>
      </view>

      <!-- 联系方式（购买后可见） -->
      <view v-if="detail.source === 'purchased'" class="info-card">
        <view class="info-row">
          <text class="info-label">联系人</text>
          <text class="info-value">{{ detail.contact_name || '未填写' }}</text>
        </view>
        <view class="info-row" @click="callPhone">
          <text class="info-label">电话</text>
          <text class="info-value contact-phone">{{ detail.contact_phone || '未填写' }}</text>
        </view>
        <view v-if="detail.wechat" class="info-row">
          <text class="info-label">微信号</text>
          <text class="info-value">{{ detail.wechat }}</text>
        </view>
      </view>

      <!-- 具体地址 -->
      <view v-if="detail.address" class="section-card">
        <view class="section-title">具体地址</view>
        <view class="section-text">{{ detail.address }}</view>
      </view>

      <!-- 项目现状 -->
      <view v-if="detail.stage" class="section-card">
        <view class="section-title">项目现状</view>
        <view class="section-text">{{ stageLabel(detail.stage) }}</view>
      </view>

      <!-- 项目概要 -->
      <view v-if="detail.description_full" class="section-card">
        <view class="section-title">项目概要</view>
        <view class="section-text section-text--rich">{{ detail.description_full }}</view>
      </view>

      <!-- 图纸附件 -->
      <view v-if="detail.attachments && detail.attachments.length" class="section-card">
        <view class="section-title">图纸附件</view>
        <view class="attach-grid">
          <view
            v-for="(url, idx) in detail.attachments"
            :key="idx"
            class="attach-item"
            @click="previewImage(idx)"
          >
            <image :src="absUrl(url)" class="attach-img" mode="aspectFill" />
            <text class="attach-label">附件{{ idx + 1 }}</text>
          </view>
        </view>
      </view>

      <!-- 同步进展 / 跟进记录 Tab -->
      <view class="section-card tabs-card">
        <view class="tabs-header">
          <view
            class="tab-item"
            :class="{ active: activeTab === 'progress' }"
            @click="activeTab = 'progress'"
          >
            同步进展
          </view>
          <view
            class="tab-item"
            :class="{ active: activeTab === 'follow' }"
            @click="activeTab = 'follow'"
          >
            跟进记录
          </view>
        </view>

        <!-- 同步进展 -->
        <view v-if="activeTab === 'progress'">
          <MarketIntelligence
            v-if="detail.marketIntelligence && detail.marketIntelligence.totalShares > 0"
            :intelligence="detail.marketIntelligence"
            @changed="fetchDetail"
          />
          <view v-else class="empty-tip">暂无人同步进展</view>
        </view>

        <!-- 跟进记录 -->
        <view v-if="activeTab === 'follow'">
          <view v-if="!visibleFollowUps.length" class="empty-tip">暂无跟进记录</view>
          <view v-else>
            <view v-for="fu in visibleFollowUps" :key="fu.id" class="follow-item">
              <view class="follow-item-header">
                <text class="follow-status" :style="followStatusStyleOf(fu.status)">
                  {{ followUpStatusLabel(fu.status) }}
                </text>
                <text class="follow-time">{{ formatDate(fu.created_at) }}</text>
              </view>
              <view class="follow-item-content">{{ fu.content_private }}</view>
              <view v-if="fu.next_follow_date" class="follow-item-remind">
                下次跟进：{{ formatDate(fu.next_follow_date) }}
              </view>
              <view
                v-if="detail.opportunity_id"
                class="follow-item-share"
                @click="shareFromFollowUp(fu)"
              >
                同步进展
              </view>
            </view>
            <view v-if="followUpTotalPages > 1" class="mi-pagination">
              <view class="page-btn" :class="{ disabled: followUpPage <= 1 }" @click="pageFollowUp(-1)">上一页</view>
              <view class="page-info">{{ followUpPage }} / {{ followUpTotalPages }}</view>
              <view class="page-btn" :class="{ disabled: followUpPage >= followUpTotalPages }" @click="pageFollowUp(1)">下一页</view>
            </view>
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-bar">
        <view class="action-btn action-btn--primary" @click="openFollowUp">新增跟进</view>
        <view class="action-btn" @click="goShare">同步进展</view>
      </view>

      <!-- 新增跟进弹窗 -->
      <view v-if="showFollowUp" class="modal-mask" @click.self="showFollowUp = false">
        <view class="modal">
          <view class="modal-title">新增跟进记录</view>
          <view class="dialog-body">
            <view class="dialog-label">跟进状态：</view>
            <view class="status-chips">
              <view
                v-for="s in FOLLOW_UP_STATUS"
                :key="s.value"
                class="status-chip"
                :class="{ active: followUpForm.status === s.value }"
                @click="followUpForm.status = s.value"
              >
                {{ s.label }}
              </view>
            </view>
            <textarea
              v-model="followUpForm.contentPrivate"
              class="follow-input"
              placeholder="记录本次跟进的详细内容"
              :maxlength="500"
            />
            <view class="date-row" @click="showDatePicker = true">
              <text class="dialog-label">下次跟进日期：</text>
              <text class="date-value" :class="{ placeholder: !followUpForm.nextFollowDate }">
                {{ followUpForm.nextFollowDate || '请选择日期' }}
              </text>
            </view>
          </view>
          <view class="modal-actions">
            <view class="modal-btn" @click="showFollowUp = false">取消</view>
            <view class="modal-btn modal-btn--primary" :class="{ disabled: submitting }" @click="handleAddFollowUp">
              {{ submitting ? '提交中' : '提交' }}
            </view>
          </view>
        </view>
      </view>

      <!-- 日期选择 -->
      <picker
        v-if="showDatePicker"
        mode="date"
        :value="followUpForm.nextFollowDate || ''"
        :start="dateStart"
        :end="dateEnd"
        @cancel="showDatePicker = false"
        @change="onDateChange"
        @click="markShow"
      >
        <view class="picker-catch" />
      </picker>
    </template>

    <view class="bottom-space" />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { api } from '@/api/index';
import { UPLOAD_BASE } from '@/common/config';
import {
  CRM_STATUS_META,
  FOLLOW_UP_STATUS,
  FOLLOW_UP_STATUS_META,
  crmStatusLabel,
  followUpStatusLabel,
  stageLabel,
  formatDate,
} from '@/common/constants';
import MarketIntelligence from '@/components/MarketIntelligence.vue';

const id = ref('');
const detail = ref(null);
const loading = ref(true);
const activeTab = ref('progress');
const showFollowUp = ref(false);
const showDatePicker = ref(false);
const submitting = ref(false);
const followUpPage = ref(1);
const followUpPageSize = 6;

const followUpForm = ref({
  status: 'call_no_answer',
  contentPrivate: '',
  nextFollowDate: '',
});

const dateStart = '2024-01-01';
const dateEnd = '2030-12-31';

onLoad((options) => {
  id.value = options.id || '';
  fetchDetail();
});

async function fetchDetail() {
  if (!id.value) {
    loading.value = false;
    return;
  }
  try {
    const res = await api.crmDetail(id.value);
    detail.value = res;
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

const statusStyle = computed(() => {
  const meta = CRM_STATUS_META[detail.value?.status] || CRM_STATUS_META.pending;
  return { color: meta.color };
});

function followStatusStyleOf(value) {
  const meta = FOLLOW_UP_STATUS_META[value] || FOLLOW_UP_STATUS_META.call_no_answer;
  return { color: meta.color, background: meta.bg };
}

const followUps = computed(() => detail.value?.followUps || []);
const followUpTotalPages = computed(() => Math.max(1, Math.ceil(followUps.value.length / followUpPageSize)));
const visibleFollowUps = computed(() => followUps.value.slice((followUpPage.value - 1) * followUpPageSize, followUpPage.value * followUpPageSize));

function pageFollowUp(dir) {
  const next = followUpPage.value + dir;
  if (next < 1 || next > followUpTotalPages.value) return;
  followUpPage.value = next;
}

function callPhone() {
  const phone = detail.value?.contact_phone;
  if (!phone) return;
  uni.makePhoneCall({ phoneNumber: phone, fail: () => {} });
}

function absUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return UPLOAD_BASE + url;
}

function previewImage(idx) {
  const urls = detail.value.attachments.map((u) => absUrl(u));
  uni.previewImage({ urls, current: urls[idx] });
}

function openFollowUp() {
  followUpForm.value = { status: 'call_no_answer', contentPrivate: '', nextFollowDate: '' };
  showFollowUp.value = true;
}

function markShow() {
  showDatePicker.value = true;
}

function onDateChange(e) {
  followUpForm.value.nextFollowDate = e.detail.value;
  showDatePicker.value = false;
}

async function handleAddFollowUp() {
  if (!followUpForm.value.contentPrivate.trim()) {
    uni.showToast({ title: '请填写跟进内容', icon: 'none' });
    return;
  }
  if (submitting.value) return;
  submitting.value = true;
  try {
    await api.addFollowUp({
      crmOpportunityId: Number(id.value),
      status: followUpForm.value.status,
      contentPrivate: followUpForm.value.contentPrivate.trim(),
      nextFollowDate: followUpForm.value.nextFollowDate || undefined,
    });
    uni.showToast({ title: '跟进记录已添加', icon: 'none' });
    showFollowUp.value = false;
    activeTab.value = 'follow';
    followUpPage.value = 1;
    await fetchDetail();
  } catch (e) {
    uni.showToast({ title: e.message || '添加失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}

function goShare() {
  uni.navigateTo({
    url: `/pages/followup/share?opportunityId=${detail.value.opportunity_id}&crmId=${id.value}`,
  });
}

function shareFromFollowUp(fu) {
  uni.navigateTo({
    url: `/pages/followup/share?opportunityId=${detail.value.opportunity_id}&crmId=${id.value}&followUpId=${fu.id}&status=${fu.status}&summary=${encodeURIComponent(fu.content_private || '')}`,
  });
}
</script>

<style lang="scss" scoped>
.crm-detail-page {
  min-height: 100vh;
  padding-bottom: 160rpx;
}

.loading-tip,
.empty {
  text-align: center;
  padding: 100rpx 0;
  color: #B0B0B0;
  font-size: 28rpx;
}

.info-card,
.section-card {
  margin: 16rpx 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 8rpx 24rpx;
}

.info-row {
  display: flex;
  padding: 20rpx 0;
  border-bottom: 1px solid #F2F4F5;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  width: 160rpx;
  font-size: 26rpx;
  color: #7A7A7A;
  flex-shrink: 0;
}

.info-value {
  flex: 1;
  font-size: 26rpx;
  color: #1A1A1A;
  text-align: right;
}

.contact-phone {
  color: #048C47;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
  padding: 20rpx 0 12rpx;
}

.section-text {
  font-size: 26rpx;
  color: #4A4A4A;
  line-height: 1.6;
  padding-bottom: 16rpx;
}

.section-text--rich {
  white-space: pre-wrap;
  word-break: break-word;
}

/* 附件 */
.attach-grid {
  display: flex;
  flex-wrap: wrap;
  padding-bottom: 16rpx;
}

.attach-item {
  width: calc(33.333% - 16rpx);
  margin: 8rpx;
}

.attach-img {
  width: 100%;
  height: 160rpx;
  border-radius: 12rpx;
  background: #F2F4F5;
}

.attach-label {
  display: block;
  text-align: center;
  font-size: 20rpx;
  color: #B0B0B0;
  margin-top: 4rpx;
}

/* Tab */
.tabs-card {
  padding-bottom: 24rpx;
}

.tabs-header {
  display: flex;
  border-bottom: 1px solid #F2F4F5;
  margin-bottom: 16rpx;
}

.tab-item {
  padding: 24rpx 32rpx;
  font-size: 28rpx;
  color: #7A7A7A;
  position: relative;
}

.tab-item.active {
  color: #048C47;
  font-weight: 600;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -2rpx;
  transform: translateX(-50%);
  width: 48rpx;
  height: 6rpx;
  border-radius: 3rpx;
  background: #048C47;
}

.empty-tip {
  text-align: center;
  padding: 60rpx 0;
  color: #B0B0B0;
  font-size: 26rpx;
}

/* 跟进记录 */
.follow-item {
  padding: 16rpx 0;
  border-bottom: 1px solid #F2F4F5;
}

.follow-item:last-child {
  border-bottom: none;
}

.follow-item-header {
  display: flex;
  align-items: center;
}

.follow-status {
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  margin-right: 12rpx;
}

.follow-time {
  font-size: 22rpx;
  color: #B0B0B0;
}

.follow-item-content {
  font-size: 26rpx;
  color: #4A4A4A;
  line-height: 1.6;
  margin-top: 8rpx;
  word-break: break-word;
}

.follow-item-remind {
  font-size: 24rpx;
  color: #E8920A;
  margin-top: 8rpx;
}

.follow-item-share {
  display: inline-block;
  margin-top: 12rpx;
  padding: 6rpx 24rpx;
  border-radius: 24rpx;
  font-size: 22rpx;
  color: #048C47;
  background: rgba(4, 140, 71, 0.08);
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

/* 操作栏 */
.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #ffffff;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 16rpx rgba(0, 0, 0, 0.06);
  display: flex;
  z-index: 100;
}

.action-btn {
  flex: 1;
  height: 84rpx;
  line-height: 84rpx;
  text-align: center;
  border-radius: 42rpx;
  font-size: 30rpx;
  color: #048C47;
  border: 1px solid #048C47;
  margin-left: 16rpx;
}

.action-btn:first-child {
  margin-left: 0;
}

.action-btn--primary {
  color: #ffffff;
  background: #048C47;
}

.bottom-space {
  height: 160rpx;
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
  z-index: 200;
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
}

.status-chips {
  display: flex;
  flex-wrap: wrap;
  margin-top: 16rpx;
}

.status-chip {
  padding: 12rpx 28rpx;
  margin: 0 16rpx 16rpx 0;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #7A7A7A;
  background: #F2F4F5;
}

.status-chip.active {
  color: #ffffff;
  background: #048C47;
}

.follow-input {
  width: 100%;
  box-sizing: border-box;
  height: 140rpx;
  background: #F2F4F5;
  border-radius: 12rpx;
  padding: 16rpx;
  font-size: 26rpx;
  margin-top: 8rpx;
}

.date-row {
  display: flex;
  align-items: center;
  padding: 16rpx 0 8rpx;
}

.date-value {
  font-size: 26rpx;
  color: #1A1A1A;
  margin-left: 12rpx;
}

.date-value.placeholder {
  color: #B0B0B0;
}

.picker-catch {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
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