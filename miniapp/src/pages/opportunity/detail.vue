<template>
  <view class="detail-page">
    <!-- 概览卡片 -->
    <view v-if="detail" class="overview">
      <view v-if="detail.isPurchased" class="purchased-badge">已购买</view>
      <view class="ov-tags">
        <text class="status-tag" :style="statusStyle">{{ statusLabel }}</text>
        <text class="cat-tag">{{ detail.categoryName }}</text>
      </view>
      <view class="ov-title">{{ detail.title }}</view>
      <view class="ov-meta">
        <text>{{ detail.city || '未知城市' }}</text>
        <text class="meta-sep">·</text>
        <text>{{ displayBrand }}</text>
        <text v-if="detail.createdAt" class="meta-sep">·</text>
        <text v-if="detail.createdAt">{{ formatDate(detail.createdAt) }}</text>
      </view>
      <view v-if="detail.tags && detail.tags.length" class="ov-tag-list">
        <text v-for="t in detail.tags" :key="t.id" class="tag-item">{{ t.name }}</text>
      </view>
      <view class="ov-price-bar">
        <view class="ov-price">
          <text>{{ detail.price }}</text>
          <text class="price-unit"> 积分</text>
        </view>
        <view class="ov-stats">
          <text>{{ detail.purchaseCount || 0 }} 人购买</text>
          <text class="stats-sep">·</text>
          <text>{{ detail.viewCount || 0 }} 次浏览</text>
          <text v-if="detail.invalidMarkCount > 0" class="invalid-count">· {{ detail.invalidMarkCount }} 人标记无效</text>
        </view>
      </view>
    </view>

    <!-- 未购买：预览 + 遮罩 -->
    <template v-if="detail && !canViewFull">
      <view v-if="previewLines" class="preview">
        <view class="section-title">需求描述</view>
        <view class="preview-text">{{ previewLines }}</view>
        <view class="preview-mask" />
        <view class="preview-lock">
          <text class="lock-icon">🔒</text>
          <text>购买后查看完整内容</text>
        </view>
      </view>
      <view v-else class="detail-lock">
        <text class="lock-big-icon">🔒</text>
        <text class="lock-text">购买后查看需求描述、项目现状、具体地址、联系人、项目概要及图纸附件</text>
      </view>

      <view class="publisher-section">
        <view class="section-title">投稿人</view>
        <view class="publisher">
          <view class="pub-avatar">{{ publisherDisplay[0] || '匿' }}</view>
          <view class="pub-info">
            <view class="pub-name">{{ publisherDisplay }}</view>
          </view>
        </view>
      </view>
    </template>

    <!-- 购买后：完整信息展示 -->
    <template v-if="detail && canViewFull">
      <view v-if="detail.descriptionPublic" class="info-section">
        <view class="section-title">需求描述</view>
        <view class="section-content">{{ detail.descriptionPublic }}</view>
      </view>

      <view v-if="detail.stage || detail.validUntil || detail.address" class="info-section">
        <view class="section-title">项目信息</view>
        <view class="info-grid">
          <view v-if="detail.stage" class="info-row">
            <text class="info-label">项目现状</text>
            <text class="info-value">{{ stageLabel(detail.stage) }}</text>
          </view>
          <view v-if="detail.validUntil" class="info-row">
            <text class="info-label">有效期</text>
            <text class="info-value">{{ formatDate(detail.validUntil) }}</text>
          </view>
          <view v-if="detail.address" class="info-row info-row--full">
            <text class="info-label">具体地址</text>
            <text class="info-value">{{ detail.address }}</text>
          </view>
        </view>
      </view>

      <view class="info-section">
        <view class="section-title">联系方式</view>
        <view class="contact-list">
          <view class="contact-row">
            <text class="info-label">联系人</text>
            <text class="info-value">{{ detail.contactName || '未填写' }}</text>
          </view>
          <view class="contact-row" @click="callPhone">
            <text class="info-label">电话</text>
            <text class="info-value contact-phone">{{ detail.contactPhone || '未填写' }}</text>
          </view>
          <view v-if="detail.wechat" class="contact-row">
            <text class="info-label">微信号</text>
            <text class="info-value">{{ detail.wechat }}</text>
          </view>
        </view>
      </view>

      <view v-if="attachments.length" class="info-section">
        <view class="section-title">图纸附件</view>
        <view class="attach-grid">
          <view
            v-for="(url, idx) in attachments"
            :key="idx"
            class="attach-item"
            @click="previewImage(idx)"
          >
            <image :src="absUrl(url)" class="attach-img" mode="aspectFill" />
            <text class="attach-label">附件{{ idx + 1 }}</text>
          </view>
        </view>
      </view>

      <view v-if="detail.descriptionFull" class="info-section">
        <view class="section-title">项目概要</view>
        <view class="section-content">{{ detail.descriptionFull }}</view>
      </view>

      <!-- 共享进度榜 -->
      <view
        v-if="detail.marketIntelligence && detail.marketIntelligence.totalShares > 0"
        class="info-section"
      >
        <view class="section-title">共享进度</view>
        <MarketIntelligence
          :intelligence="detail.marketIntelligence"
          @changed="reload"
        />
      </view>

      <view class="publisher-section">
        <view class="section-title">投稿人</view>
        <view class="publisher">
          <view class="pub-avatar">{{ publisherDisplay[0] || '匿' }}</view>
          <view class="pub-info">
            <view class="pub-name">{{ publisherDisplay }}</view>
          </view>
        </view>
      </view>
    </template>

    <view v-if="loading" class="loading-tip">加载中...</view>
    <view v-if="!loading && !detail" class="empty">商机不存在</view>

    <!-- 底部固定操作栏 -->
    <view v-if="detail && !loading" class="action-bar">
      <template v-if="!canViewFull && detail.status === 'active'">
        <view class="buy-btn" :class="{ disabled: purchasing }" @click="handlePurchase">
          {{ purchasing ? '购买中...' : `花费 ${detail.price} 积分解锁全部信息` }}
        </view>
      </template>
      <template v-else-if="canViewFull">
        <view class="action-group">
          <view class="action-btn action-btn--primary" @click="goCrm">
            {{ detail.isPublisher ? '查看跟进分布' : '进入CRM' }}
          </view>
          <view v-if="detail.isPurchased && detail.crmId" class="action-btn" @click="goAddFollowUp">新增跟进</view>
          <view v-if="detail.isPurchased && detail.crmId" class="action-btn" @click="goShare">共享进度</view>
          <view v-if="detail.isPurchased" class="action-btn action-btn--warn" @click="showInvalid = true">标记无效</view>
        </view>
      </template>
    </view>

    <!-- 购买确认弹窗 -->
    <view v-if="showBuy" class="modal-mask" @click.self="showBuy = false">
      <view class="modal">
        <view class="modal-title">确认购买</view>
        <view class="buy-detail">
          <view class="buy-row">
            <text>原价</text>
            <text>{{ detail.price }} 积分</text>
          </view>
          <view class="buy-row">
            <text>会员折扣（{{ levelInfo.label }}）</text>
            <text>{{ levelInfo.discount }}</text>
          </view>
          <view class="buy-row buy-row--total">
            <text>实付</text>
            <text>{{ payable }} 积分</text>
          </view>
        </view>
        <view class="modal-actions">
          <view class="modal-btn" @click="showBuy = false">取消</view>
          <view class="modal-btn modal-btn--primary" :class="{ disabled: purchasing }" @click="confirmPurchase">
            {{ purchasing ? '支付中...' : '确认' }}
          </view>
        </view>
      </view>
    </view>

    <!-- 标记无效弹窗 -->
    <view v-if="showInvalid" class="modal-mask" @click.self="showInvalid = false">
      <view class="modal">
        <view class="modal-title">标记无效</view>
        <view class="dialog-body">
          <view class="dialog-label">请选择标记原因：</view>
          <view class="reason-chips">
            <view
              v-for="r in INVALID_REASONS"
              :key="r.value"
              class="reason-chip"
              :class="{ active: invalidReason === r.value }"
              @click="invalidReason = r.value"
            >
              {{ r.label }}
            </view>
          </view>
          <textarea
            v-model="invalidReasonText"
            class="reason-input"
            placeholder="补充说明（可选）"
            :maxlength="200"
          />
        </view>
        <view class="modal-actions">
          <view class="modal-btn" @click="showInvalid = false">取消</view>
          <view class="modal-btn modal-btn--primary" :class="{ disabled: submitting }" @click="handleMarkInvalid">
            {{ submitting ? '提交中' : '提交' }}
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-space" />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { api } from '@/api/index';
import { useUserStore } from '@/store/user';
import { UPLOAD_BASE } from '@/common/config';
import { INVALID_REASONS, OPPORTUNITY_STATUS_META, LEVEL_META, stageLabel, maskName, formatDate } from '@/common/constants';
import MarketIntelligence from '@/components/MarketIntelligence.vue';

onShareAppMessage(() => {
  const title = detail.value?.title || '商机互助：解锁酒店商机';
  return {
    title,
    path: `/pages/opportunity/detail?id=${id.value}`,
  };
});

const userStore = useUserStore();
const id = ref('');
const detail = ref(null);
const loading = ref(true);
const purchasing = ref(false);
const submitting = ref(false);
const showBuy = ref(false);
const showInvalid = ref(false);
const invalidReason = ref('');
const invalidReasonText = ref('');

onLoad((options) => {
  id.value = options.id || '';
  load();
});

async function load() {
  if (!id.value) {
    loading.value = false;
    return;
  }
  try {
    const res = await api.opportunity(id.value);
    detail.value = res;
    const total = res?.marketIntelligence?.totalShares || 0;
    try {
      uni.setStorageSync(`viewedShares_${id.value}`, total);
    } catch (e) {}
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function reload() {
  try {
    const res = await api.opportunity(id.value);
    detail.value = res;
  } catch (e) {}
}

const canViewFull = computed(() => !!detail.value && (detail.value.isPurchased || detail.value.isPublisher));
const statusMeta = computed(() => OPPORTUNITY_STATUS_META[detail.value?.status] || OPPORTUNITY_STATUS_META.active);
const statusLabel = computed(() => statusMeta.value.label);
const statusStyle = computed(() => ({
  color: statusMeta.value.color,
  background: statusMeta.value.bg,
}));
const displayBrand = computed(() => detail.value?.brand || detail.value?.hotelName || '未知品牌');
const publisherDisplay = computed(() => maskName(detail.value?.publisherName));
const previewLines = computed(() => {
  const src = detail.value?.descriptionPublic || '';
  return src.split('\n').filter(Boolean).slice(0, 2).join('\n');
});
const attachments = computed(() => {
  const list = detail.value?.attachments || [];
  return Array.isArray(list) ? list : [];
});

const levelInfo = computed(() => LEVEL_META[userStore.user?.level] || LEVEL_META.normal);
const rateMap = { '无折扣': 1, '9折': 0.9, '8折': 0.8, '7折': 0.7 };
const payable = computed(() => {
  const price = detail.value?.price || 0;
  const rate = rateMap[levelInfo.value.discount] || 1;
  return Math.ceil(price * rate);
});

function requireLogin() {
  if (!userStore.isAuthenticated) {
    uni.navigateTo({ url: '/pages/login/index' });
    return false;
  }
  return true;
}

function handlePurchase() {
  if (!requireLogin() || purchasing.value) return;
  showBuy.value = true;
}

async function confirmPurchase() {
  if (purchasing.value) return;
  purchasing.value = true;
  try {
    const res = await api.purchase({ opportunityId: Number(id.value) });
    uni.showToast({
      title: res?.actualPrice != null ? `购买成功，实付 ${res.actualPrice} 积分` : '购买成功',
      icon: 'none',
    });
    showBuy.value = false;
    await reload();
  } catch (e) {
    uni.showToast({ title: e.message || '购买失败', icon: 'none' });
  } finally {
    purchasing.value = false;
  }
}

async function handleMarkInvalid() {
  if (!invalidReason.value) {
    uni.showToast({ title: '请选择标记原因', icon: 'none' });
    return;
  }
  if (submitting.value) return;
  submitting.value = true;
  try {
    await api.markInvalid(id.value, {
      reason: invalidReason.value,
      reasonText: invalidReasonText.value.trim() || undefined,
    });
    uni.showToast({ title: '标记成功', icon: 'none' });
    showInvalid.value = false;
    invalidReason.value = '';
    invalidReasonText.value = '';
    await reload();
  } catch (e) {
    uni.showToast({ title: e.message || '标记失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}

function callPhone() {
  const phone = detail.value?.contactPhone;
  if (!phone) return;
  uni.makePhoneCall({ phoneNumber: phone, fail: () => {} });
}

function absUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return UPLOAD_BASE + url;
}

function previewImage(idx) {
  const urls = attachments.value.map((u) => absUrl(u));
  uni.previewImage({ urls, current: urls[idx] });
}

function goCrm() {
  uni.switchTab({ url: '/pages/crm/index' });
}

function goAddFollowUp() {
  uni.navigateTo({ url: `/pages/crm/detail?id=${detail.value.crmId}` });
}

function goShare() {
  uni.navigateTo({ url: `/pages/followup/share?opportunityId=${detail.value.id}&crmId=${detail.value.crmId}` });
}
</script>

<style lang="scss" scoped>
.detail-page {
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

/* 概览卡片 */
.overview {
  background: #ffffff;
  padding: 28rpx 24rpx;
  position: relative;
}

.purchased-badge {
  position: absolute;
  top: 20rpx;
  right: 0;
  padding: 6rpx 24rpx;
  font-size: 22rpx;
  color: #048C47;
  background: #E4F7EC;
  border-radius: 32rpx 0 0 32rpx;
}

.ov-tags {
  display: flex;
  margin-bottom: 16rpx;
}

.status-tag,
.cat-tag {
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  margin-right: 12rpx;
}

.cat-tag {
  color: #048C47;
  background: #E4F7EC;
}

.ov-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1A1A1A;
  line-height: 1.4;
}

.ov-meta {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #7A7A7A;
}

.meta-sep {
  margin: 0 8rpx;
}

.ov-tag-list {
  margin-top: 16rpx;
  display: flex;
  flex-wrap: wrap;
}

.tag-item {
  padding: 4rpx 16rpx;
  margin: 0 12rpx 12rpx 0;
  font-size: 22rpx;
  color: #048C47;
  background: #E4F7EC;
  border-radius: 8rpx;
}

.ov-price-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 20rpx;
}

.ov-price {
  font-size: 44rpx;
  font-weight: 700;
  color: #E54848;
}

.price-unit {
  font-size: 24rpx;
  font-weight: 400;
}

.ov-stats {
  font-size: 22rpx;
  color: #B0B0B0;
}

.stats-sep {
  margin: 0 8rpx;
}

.invalid-count {
  color: #E54848;
}

/* 未购买预览 */
.preview {
  position: relative;
  margin: 16rpx 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  overflow: hidden;
}

.preview-text {
  font-size: 28rpx;
  color: #4A4A4A;
  line-height: 1.6;
  min-height: 80rpx;
}

.preview-mask {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 120rpx;
  background: linear-gradient(to top, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0));
}

.preview-lock {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 0 8rpx;
  color: #B0B0B0;
  font-size: 24rpx;
}

.lock-icon {
  font-size: 40rpx;
  margin-bottom: 8rpx;
}

.detail-lock {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 16rpx 24rpx;
  padding: 80rpx 40rpx;
  background: #ffffff;
  border-radius: 16rpx;
}

.lock-big-icon {
  font-size: 60rpx;
  margin-bottom: 16rpx;
}

.lock-text {
  font-size: 26rpx;
  color: #B0B0B0;
  text-align: center;
  line-height: 1.6;
}

/* 信息区块 */
.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 16rpx;
}

.info-section,
.publisher-section {
  margin: 16rpx 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.section-content {
  font-size: 28rpx;
  color: #4A4A4A;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.info-label {
  font-size: 26rpx;
  color: #7A7A7A;
  flex-shrink: 0;
  width: 160rpx;
}

.info-value {
  font-size: 26rpx;
  color: #1A1A1A;
}

.info-row,
.contact-row {
  display: flex;
  padding: 14rpx 0;
}

.info-row--full .info-value {
  flex: 1;
}

.contact-phone {
  color: #048C47;
}

/* 附件网格 */
.attach-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -8rpx;
}

.attach-item {
  width: calc(33.333% - 16rpx);
  margin: 8rpx;
  position: relative;
}

.attach-img {
  width: 100%;
  height: 180rpx;
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

/* 投稿人 */
.publisher {
  display: flex;
  align-items: center;
}

.pub-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #048C47;
  color: #ffffff;
  font-size: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.pub-name {
  font-size: 30rpx;
  color: #1A1A1A;
}

/* 底部操作栏 */
.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #ffffff;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 16rpx rgba(0, 0, 0, 0.06);
  z-index: 100;
}

.buy-btn {
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 44rpx;
  background: #048C47;
  color: #ffffff;
  font-size: 30rpx;
}

.buy-btn.disabled,
.modal-btn--primary.disabled {
  opacity: 0.6;
}

.action-group {
  display: flex;
  flex-wrap: wrap;
}

.action-btn {
  padding: 16rpx 32rpx;
  margin: 4rpx 12rpx 4rpx 0;
  border-radius: 36rpx;
  font-size: 26rpx;
  color: #048C47;
  border: 1px solid #048C47;
}

.action-btn--primary {
  color: #ffffff;
  background: #048C47;
  border-color: #048C47;
}

.action-btn--warn {
  color: #E54848;
  border-color: #E54848;
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

.buy-detail {
  background: #F8FAF9;
  border-radius: 12rpx;
  padding: 20rpx;
}

.buy-row {
  display: flex;
  justify-content: space-between;
  font-size: 28rpx;
  color: #4A4A4A;
  padding: 8rpx 0;
}

.buy-row--total {
  font-weight: 700;
  color: #E54848;
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
</style>