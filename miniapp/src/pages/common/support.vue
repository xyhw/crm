<template>
  <view class="support-page">
    <view class="card">
      <view class="support-row disabled" @click="callHotline">
        <text class="support-label">客服热线</text>
        <view class="support-value">
          <text>{{ hotline || '暂未开通' }}</text>
        </view>
      </view>
      <view class="support-row disabled" @click="copyEmail">
        <text class="support-label">客服邮箱</text>
        <view class="support-value">
          <text>{{ email || '暂未开通' }}</text>
        </view>
      </view>
    </view>

    <view class="card support-info">
      <view class="info-line">工作时间：周一至周日 9:00-21:00</view>
      <view class="info-title">常见问题：</view>
      <view class="info-line">1. 积分充值后立即到账，可在积分流水页面查看</view>
      <view class="info-line">2. 购买商机后自动加入CRM，可在CRM页面跟进</view>
      <view class="info-line">3. 如果发现商机信息有误，可在商机详情页点击「无效反馈」</view>
      <view class="info-line">4. 邀请好友加入可获得积分奖励，邀请海报在「邀请」页面查看</view>
      <view class="info-line">5. 客服通道开通后，可在本页拨号或复制邮箱联系</view>
    </view>
  </view>
</template>

<script setup>
const hotline = '';
const email = '';

function callHotline() {
  uni.showToast({ title: '客服热线暂未开通', icon: 'none' });
}

function copyEmail() {
  uni.showToast({ title: '客服邮箱暂未开通', icon: 'none' });
}
</script>

<style lang="scss" scoped>
.support-page {
  min-height: 100vh;
  padding: 24rpx;
}

.card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 8rpx 24rpx;
  margin-bottom: 16rpx;
}

.support-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1px solid #F2F4F5;
}

.support-row:last-child {
  border-bottom: none;
}

.support-row.disabled {
  opacity: 0.7;
}

.support-label {
  font-size: 28rpx;
  color: #1A1A1A;
}

.support-value {
  display: flex;
  align-items: center;
  font-size: 26rpx;
  color: #555555;
}

.support-info {
  padding: 24rpx;
}

.info-title {
  margin: 16rpx 0 8rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.info-line {
  font-size: 26rpx;
  color: #555555;
  line-height: 1.7;
}
</style>
