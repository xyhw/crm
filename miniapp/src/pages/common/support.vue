<template>
  <view class="support-page">
    <view class="card">
      <view class="support-row" @click="callHotline">
        <text class="support-label">客服热线</text>
        <view class="support-value">
          <text>400-123-4567</text>
          <text class="arrow">›</text>
        </view>
      </view>
      <view class="support-row" @click="copyEmail">
        <text class="support-label">客服邮箱</text>
        <view class="support-value">
          <text>support@hotel-order.com</text>
          <text class="arrow">›</text>
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
      <view class="info-line">5. 如需更多帮助，请联系客服热线或发送邮件</view>
    </view>
  </view>
</template>

<script setup>
function callHotline() {
  uni.makePhoneCall({
    phoneNumber: '400-123-4567',
    fail: () => uni.showToast({ title: '拨号失败', icon: 'none' }),
  });
}

function copyEmail() {
  uni.setClipboardData({
    data: 'support@hotel-order.com',
    success: () => uni.showToast({ title: '邮箱已复制', icon: 'none' }),
  });
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

.support-label {
  font-size: 28rpx;
  color: #1A1A1A;
}

.support-value {
  display: flex;
  align-items: center;
  font-size: 26rpx;
  color: #048C47;
}

.arrow {
  margin-left: 8rpx;
  color: #B0B0B0;
  font-size: 32rpx;
}

.support-info {
  padding: 24rpx;
}

.info-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
  margin: 12rpx 0 8rpx;
}

.info-line {
  font-size: 26rpx;
  color: #4A4A4A;
  line-height: 1.8;
}
</style>