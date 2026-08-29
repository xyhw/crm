<template>
  <view class="home-page">
    <!-- 未读提醒条 -->
    <view v-if="unreadCount > 0" class="home-reminder-bar" @click="goPage('/pages/community/notify')">
      {{ unreadCount }} 条未读通知
    </view>

    <!-- 公告条（单行轮播） -->
    <view v-if="announcements.length" class="announcement-card" @click="goAnnouncement(currentAnn)">
      <text class="announcement-card__badge">公告</text>
      <text class="announcement-card__title">{{ currentAnn.title }}</text>
      <text v-if="timeAgo(currentAnn.created_at)" class="announcement-card__time">{{ timeAgo(currentAnn.created_at) }}</text>
      <text class="announcement-card__more">›</text>
    </view>

    <!-- 用户卡片 -->
    <view class="home-user">
      <view class="home-user__top">
        <view class="home-user__avatar">{{ (user?.nickname || '友')[0] }}</view>
        <view class="home-user__info">
          <view class="home-user__name">{{ user?.nickname || '未登录' }}</view>
          <view class="home-user__level-tag">{{ level.label }}</view>
        </view>
        <view class="home-user__points" @click="goPage('/pages/points/index')">
          <view class="home-user__points-num">{{ user?.pointsBalance ?? 0 }}</view>
          <view class="home-user__points-label">我的积分</view>
        </view>
      </view>

      <view class="home-user__stats">
        <view class="home-user__stat" @click="goPage('/pages/community/reminder')">
          <text class="home-user__stat-num">{{ followCount }}</text>
          <text class="home-user__stat-label">待跟进</text>
        </view>
        <view class="home-user__stat" @click="switchTab('/pages/crm/index')">
          <text class="home-user__stat-num">{{ stats?.crm ?? 0 }}</text>
          <text class="home-user__stat-label">我的CRM</text>
        </view>
        <view class="home-user__stat" @click="goPage('/pages/order/list')">
          <text class="home-user__stat-num">{{ stats?.published ?? 0 }}</text>
          <text class="home-user__stat-label">我的投稿</text>
        </view>
        <view class="home-user__stat" @click="goPage('/pages/community/notify')">
          <text class="home-user__stat-num">{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
          <text class="home-user__stat-label">通知</text>
        </view>
      </view>
    </view>

    <!-- 商机区 Tab -->
    <view class="section-head">
      <view class="home-tabs">
        <text
          v-for="t in tabs"
          :key="t.value"
          class="home-tab"
          :class="{ active: tab === t.value }"
          @click="switchTab2(t.value)"
        >
          {{ t.label }}
        </text>
      </view>
      <view class="section-actions">
        <text class="section-action" @click="goPage('/pages/community/ranking')">排行榜</text>
        <text class="section-action" @click="goPage('/pages/hall/hall')">查看全部 ›</text>
      </view>
    </view>

    <!-- 商机列表 -->
    <view v-if="listLoading" class="empty-tip">加载中...</view>
    <view v-else-if="!list.length" class="home-empty">
      <view class="home-empty__title">{{ emptyTitle }}</view>
      <view class="home-empty__desc">{{ emptyDesc }}</view>
      <view class="home-empty__btn" @click="onEmptyAction">{{ emptyAction }}</view>
    </view>
    <view
      v-for="o in list"
      v-else
      :key="o.id"
      class="home-order"
      @click="goDetail(o.id)"
    >
      <view class="home-order__icon">
        <text class="cat-badge">{{ categoryLabel(o) }}</text>
      </view>
      <view class="home-order__body">
        <view class="home-order__title">{{ o.title }}</view>
        <view class="home-order__meta">
          {{ o.hotelName || o.brand || '未知酒店' }} · {{ o.categoryName || '未知分类' }} · {{ o.city || '未知城市' }}
        </view>
        <view class="home-order__meta">
          <text class="buy-tag">{{ o.purchaseCount || 0 }}人已购买</text>
        </view>
      </view>
      <view class="home-order__right">
        <view class="points-text">{{ o.price }} 积分</view>
        <view class="home-order__time">{{ timeAgo(o.createdAt) }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad, onPullDownRefresh, onShow, onHide, onUnload } from '@dcloudio/uni-app';
import { api } from '@/api/index';
import { useUserStore } from '@/store/user';
import { timeAgo, LEVEL_META } from '@/common/constants';

const userStore = useUserStore();
const user = computed(() => userStore.user);
const level = computed(() => LEVEL_META[user.value?.level] || LEVEL_META.normal);

const tabs = [
  { label: '最新商机', value: 'latest' },
  { label: '推荐商机', value: 'recommend' },
];

const announcements = ref([]);
const annIndex = ref(0);
const stats = ref(null);
const unreadCount = ref(0);
const followCount = ref(0);
const tab = ref('latest');
const latestList = ref([]);
const recommends = ref(null);
const listLoading = ref(true);

const currentAnn = computed(() => announcements.value[annIndex.value] || {});
const list = computed(() => (tab.value === 'recommend' ? recommends.value || [] : latestList.value));

const emptyTitle = computed(() =>
  tab.value === 'recommend' && !user.value?.category ? '还没设置供应商类型' : '暂无相关商机'
);
const emptyDesc = computed(() =>
  tab.value === 'recommend' && !user.value?.category ? '设置后为你推荐同类商机' : '发布你的第一条商机，互助从你开始'
);
const emptyAction = computed(() =>
  tab.value === 'recommend' && !user.value?.category ? '去设置' : '立即发布'
);

let annTimer = null;

function categoryLabel(o) {
  return o.categoryName || '商机';
}

async function fetchHome() {
  listLoading.value = true;
  try {
    const [ordersRes, statsRes, notifRes, todayRes, overdueRes] = await Promise.all([
      api.opportunities({ status: 'active', pageSize: 5, sort: 'newest' }),
      api.myStats().catch(() => null),
      api.notifications({ pageSize: 1 }).catch(() => ({})),
      api.reminders({ type: 'today' }).catch(() => ({})),
      api.reminders({ type: 'overdue' }).catch(() => ({})),
    ]);
    latestList.value = ordersRes?.list || [];
    stats.value = statsRes;
    unreadCount.value = notifRes?.unreadCount || 0;
    followCount.value = (todayRes?.list || []).length + (overdueRes?.list || []).length;
  } catch (e) {
    // 静默失败，展示空态
  } finally {
    listLoading.value = false;
    uni.stopPullDownRefresh();
  }
}

async function fetchAnnouncements() {
  try {
    const res = await api.announcements();
    const items = res?.list || (Array.isArray(res) ? res : []);
    announcements.value = items;
    if (items.length > 1) {
      startAnnTimer();
    }
  } catch (e) {
    announcements.value = [];
  }
}

function startAnnTimer() {
  stopAnnTimer();
  annTimer = setInterval(() => {
    annIndex.value = (annIndex.value + 1) % announcements.value.length;
  }, 4000);
}

function stopAnnTimer() {
  if (annTimer) {
    clearInterval(annTimer);
    annTimer = null;
  }
}

function fetchUser() {
  if (userStore.isAuthenticated) {
    userStore.fetchMe().catch(() => {});
  }
}

onLoad(() => {
  fetchHome();
  fetchAnnouncements();
  fetchUser();
});

onShow(() => {
  if (userStore.isAuthenticated) {
    fetchHome();
    fetchUser();
  }
});

onHide(stopAnnTimer);
onUnload(stopAnnTimer);

onPullDownRefresh(() => {
  fetchHome();
  fetchAnnouncements();
  fetchUser();
});

// 推荐商机懒加载：按用户供应商类型加权
async function loadRecommends() {
  if (!user.value?.category) return;
  try {
    const res = await api.opportunities({
      status: 'active',
      pageSize: 5,
      sort: 'recommend',
      boostCategory: Number(user.value.category),
    });
    recommends.value = res?.list || [];
  } catch (e) {
    recommends.value = [];
  }
}

function switchTab2(value) {
  if (tab.value === value) return;
  tab.value = value;
  if (value === 'recommend' && recommends.value === null) {
    listLoading.value = true;
    loadRecommends().finally(() => {
      listLoading.value = false;
    });
  }
}

function goAnnouncement(item) {
  uni.navigateTo({ url: `/pages/common/announcement?id=${item.id}` });
}

function goDetail(id) {
  uni.navigateTo({ url: `/pages/opportunity/detail?id=${id}` });
}

function goPage(url) {
  uni.navigateTo({ url });
}

function switchTab(url) {
  uni.switchTab({ url });
}

function onEmptyAction() {
  if (tab.value === 'recommend' && !user.value?.category) {
    goPage('/pages/profile/edit');
  } else {
    goPage('/pages/opportunity/publish');
  }
}
</script>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  padding-bottom: 40rpx;
}

/* 未读提醒条 */
.home-reminder-bar {
  padding: 16rpx 32rpx;
  background: #FFF4E0;
  font-size: 26rpx;
  color: #E8920A;
}

.home-reminder-bar::before {
  content: '●';
  margin-right: 8rpx;
  font-size: 16rpx;
  vertical-align: middle;
}

/* 公告条：单行紧凑 */
.announcement-card {
  display: flex;
  align-items: center;
  margin: 12rpx 24rpx 0;
  padding: 14rpx 20rpx;
  background: linear-gradient(135deg, #048C47 0%, #036B38 100%);
  border-radius: 12rpx;
}

.announcement-card__badge {
  flex-shrink: 0;
  margin-right: 14rpx;
  padding: 0 10rpx;
  border-radius: 6rpx;
  background: #FFD700;
  color: #036B38;
  font-size: 20rpx;
  font-weight: 600;
  line-height: 30rpx;
}

.announcement-card__title {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  font-weight: 600;
  color: #ffffff;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.announcement-card__time {
  flex-shrink: 0;
  margin-left: 16rpx;
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.7);
}

.announcement-card__more {
  flex-shrink: 0;
  margin-left: 12rpx;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.85);
}

/* 用户卡片：藏青绿渐变 + 网格纹理 */
.home-user {
  background:
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.05) 0 2rpx, transparent 2rpx 68rpx),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0 2rpx, transparent 2rpx 68rpx),
    linear-gradient(135deg, #048C47 0%, #036B38 100%);
  padding: 24rpx 32rpx;
  margin-top: 12rpx;
  color: #ffffff;
}

.home-user__top {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.home-user__avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  font-size: 34rpx;
  line-height: 80rpx;
  text-align: center;
  margin-right: 20rpx;
}

.home-user__info {
  flex: 1;
}

.home-user__name {
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 6rpx;
}

.home-user__level-tag {
  display: inline-block;
  padding: 0 14rpx;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.3);
  font-size: 20rpx;
  line-height: 32rpx;
}

.home-user__points {
  text-align: center;
}

.home-user__points-num {
  font-size: 42rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
  color: #FFD700;
}

.home-user__points-label {
  font-size: 22rpx;
  opacity: 0.8;
}

.home-user__stats {
  display: flex;
  background: rgba(255, 255, 255, 0.16);
  border-radius: 16rpx;
  padding: 18rpx 8rpx;
}

.home-user__stat {
  flex: 1;
  text-align: center;
}

.home-user__stat-num {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
}

.home-user__stat-label {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  opacity: 0.8;
}

/* 商机区 Tab */
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
}

.home-tabs {
  display: flex;
}

.home-tab {
  font-size: 32rpx;
  color: #B0B0B0;
  padding-bottom: 4rpx;
  border-bottom: 4rpx solid transparent;
  margin-right: 32rpx;
}

.home-tab.active {
  color: #1A1A1A;
  font-weight: 600;
  border-bottom-color: #048C47;
}

.section-actions {
  display: flex;
  align-items: center;
}

.section-action {
  font-size: 24rpx;
  color: #7A7A7A;
  margin-left: 28rpx;
}

/* 商机卡片 */
.home-order {
  display: flex;
  align-items: center;
  background: #ffffff;
  margin: 0 24rpx 16rpx;
  padding: 24rpx;
  border-radius: 16rpx;
}

.home-order__icon {
  margin-right: 24rpx;
}

.cat-badge {
  display: inline-block;
  padding: 10rpx 16rpx;
  border-radius: 10rpx;
  background: #EAF5EF;
  color: #048C47;
  font-size: 24rpx;
  white-space: nowrap;
}

.home-order__body {
  flex: 1;
  min-width: 0;
}

.home-order__title {
  font-size: 30rpx;
  font-weight: 500;
  margin-bottom: 8rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.home-order__meta {
  font-size: 24rpx;
  color: #7A7A7A;
  margin-bottom: 6rpx;
}

.buy-tag {
  display: inline-block;
  padding: 0 12rpx;
  border-radius: 6rpx;
  background: #EAF5EF;
  color: #048C47;
  font-size: 20rpx;
  line-height: 32rpx;
}

.home-order__right {
  text-align: right;
  flex-shrink: 0;
  margin-left: 16rpx;
}

.points-text {
  color: #048C47;
  font-weight: 600;
  font-size: 28rpx;
}

.home-order__time {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #7A7A7A;
}

/* 空态 */
.empty-tip {
  text-align: center;
  padding: 80rpx;
  color: #B0B0B0;
  font-size: 26rpx;
}

.home-empty {
  text-align: center;
  padding: 80rpx 40rpx;
}

.home-empty__title {
  font-size: 32rpx;
  color: #1A1A1A;
  margin-bottom: 16rpx;
}

.home-empty__desc {
  font-size: 26rpx;
  color: #7A7A7A;
  margin-bottom: 32rpx;
}

.home-empty__btn {
  display: inline-block;
  padding: 14rpx 48rpx;
  border-radius: 40rpx;
  background: #048C47;
  color: #ffffff;
  font-size: 28rpx;
}
</style>