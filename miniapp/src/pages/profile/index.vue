<template>
  <view class="profile-page">
    <!-- 用户信息卡片 -->
    <view class="profile-card">
      <view class="avatar">{{ user?.nickname?.[0] || '友' }}</view>
      <view class="profile-info">
        <view class="profile-name">{{ user?.nickname || '未登录' }}</view>
        <text class="level-tag" :style="levelStyle">{{ level.label }}</text>
      </view>
      <view class="credit">
        信用分：
        <text class="credit-val">{{ user?.creditScore || 100 }}</text>
      </view>
    </view>

    <!-- 联系/身份信息 + 积分入口 -->
    <view class="profile-meta">
      <view v-if="user?.company" class="meta-item">
        <text class="meta-label">公司</text>
        <text class="meta-value">{{ user.company }}</text>
      </view>
      <view v-if="user?.category != null" class="meta-item">
        <text class="meta-label">类型</text>
        <text class="meta-value">{{ categoryLabel(user.category) }}</text>
      </view>
      <view v-if="user?.email" class="meta-item">
        <text class="meta-label">邮箱</text>
        <text class="meta-value">{{ user.email }}</text>
      </view>
      <view class="meta-item meta-item--link" @click="goPoints">
        <text class="meta-label">我的积分</text>
        <view class="points-num">
          <text class="points-val">{{ user?.pointsBalance ?? 0 }}</text>
          <text class="arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 资质展示 -->
    <view v-if="qualifications.length" class="section-card">
      <view class="section-title">专业资质</view>
      <view v-for="(q, i) in qualifications" :key="i" class="qualification-item">
        <text class="section-mark">✔</text>
        <text class="qualification-text">{{ q }}</text>
      </view>
    </view>

    <!-- 案例展示 -->
    <view v-if="cases.length" class="section-card">
      <view class="section-title">典型案例</view>
      <view v-for="(c, i) in cases" :key="i" class="case-card">
        <text class="case-text">{{ c }}</text>
      </view>
    </view>

    <!-- 功能列表 -->
    <view class="func-card">
      <view v-for="item in funcList" :key="item.title" class="func-row" @click="onFunc(item)">
        <text class="func-title">{{ item.title }}</text>
        <text class="arrow">›</text>
      </view>
    </view>

    <!-- 设置 -->
    <view class="func-card">
      <view class="func-row" @click="goEdit">
        <text class="func-title">编辑资料</text>
        <text class="arrow">›</text>
      </view>
      <view class="func-row" @click="goAgreement('agreement')">
        <text class="func-title">用户协议与隐私</text>
        <text class="arrow">›</text>
      </view>
      <view class="func-row func-row--danger" @click="handleLogout">
        <text class="func-title">退出登录</text>
      </view>
    </view>

    <view class="footer-space" />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow, onUnload } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/user';
import { LEVEL_META, categoryLabel } from '@/common/constants';

const userStore = useUserStore();
const user = computed(() => userStore.user);

const level = computed(() => LEVEL_META[user.value?.level] || LEVEL_META.normal);
const levelStyle = computed(() => ({
  color: level.value.color,
  borderColor: level.value.color,
  backgroundColor: level.value.color + '1A',
}));

const qualifications = computed(() => (user.value?.qualifications || '').split('\n').filter(Boolean));
const cases = computed(() => (user.value?.cases || '').split('\n').filter(Boolean));

const funcList = [
  { title: '积分中心', action: 'points' },
  { title: '会员等级', action: 'level' },
  { title: '信用分', action: 'credit' },
  { title: '邀请好友', action: 'invite' },
  { title: '排行榜', action: 'ranking' },
  { title: '通知中心', action: 'notify' },
  { title: '提醒中心', action: 'reminder' },
  { title: '我的订单', action: 'orders' },
];

let shown = false;

onShow(() => {
  if (userStore.isAuthenticated && !shown) {
    userStore.fetchMe().catch(() => {});
  }
  shown = true;
});

function goPoints() {
  uni.navigateTo({ url: '/pages/points/index' });
}

function onFunc(item) {
  const map = {
    points: '/pages/points/index',
    level: '/pages/community/level',
    credit: '/pages/community/credit',
    invite: '/pages/community/invite',
    ranking: '/pages/community/ranking',
    notify: '/pages/community/notify',
    reminder: '/pages/community/reminder',
    orders: '/pages/order/list',
  };
  const url = map[item.action];
  if (url) uni.navigateTo({ url });
}

function goEdit() {
  uni.navigateTo({ url: '/pages/profile/edit' });
}

function goAgreement(type) {
  uni.navigateTo({ url: `/pages/common/agreement?type=${type}` });
}

function handleLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确认退出当前账号？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout();
      }
    },
  });
}
</script>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
}

.profile-card {
  display: flex;
  align-items: center;
  padding: 48rpx 32rpx;
  background: linear-gradient(135deg, #048C47, #06A85A);
}

.avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: #048C47;
  font-size: 44rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.profile-info {
  flex: 1;
}

.profile-name {
  font-size: 34rpx;
  font-weight: 600;
  color: #ffffff;
}

.level-tag {
  display: inline-block;
  margin-top: 8rpx;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
}

.credit {
  font-size: 26rpx;
  color: #E4F7EC;
}

.credit-val {
  font-size: 32rpx;
  font-weight: 700;
}

.profile-meta {
  margin: 16rpx 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 8rpx 24rpx;
}

.meta-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1px solid #F2F4F5;
}

.meta-item:last-child {
  border-bottom: none;
}

.meta-item--link {
  justify-content: space-between;
}

.meta-label {
  width: 160rpx;
  font-size: 26rpx;
  color: #7A7A7A;
}

.meta-value {
  flex: 1;
  font-size: 26rpx;
  color: #1A1A1A;
  text-align: right;
}

.points-num {
  display: flex;
  align-items: center;
}

.points-val {
  font-size: 28rpx;
  font-weight: 600;
  color: #048C47;
}

.arrow {
  margin-left: 8rpx;
  color: #B0B0B0;
  font-size: 32rpx;
}

.section-card,
.func-card {
  margin: 16rpx 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 12rpx;
}

.qualification-item {
  display: flex;
  align-items: flex-start;
  padding: 8rpx 0;
}

.section-mark {
  color: #048C47;
  font-size: 24rpx;
  margin-right: 12rpx;
  margin-top: 4rpx;
}

.qualification-text,
.case-text {
  flex: 1;
  font-size: 26rpx;
  color: #4A4A4A;
  line-height: 1.5;
}

.case-card {
  background: #F8FAF9;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 12rpx;
}

.case-card:last-child {
  margin-bottom: 0;
}

.func-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1px solid #F2F4F5;
}

.func-row:last-child {
  border-bottom: none;
}

.func-title {
  font-size: 28rpx;
  color: #1A1A1A;
}

.func-row--danger .func-title {
  color: #E54848;
}

.footer-space {
  height: 40rpx;
}
</style>