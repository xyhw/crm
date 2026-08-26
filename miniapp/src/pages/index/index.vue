<template>
  <view class="home-page">
    <!-- 顶部品牌区 -->
    <view class="home-hero">
      <view class="home-brand">
        <text class="brand-title">商机互助</text>
        <text class="brand-sub">酒店供应链供应商互助平台</text>
      </view>
    </view>

    <!-- 公告条 -->
    <view v-if="announcements.length" class="home-announce">
      <view
        v-for="item in announcements.slice(0, 3)"
        :key="item.id"
        class="announce-item"
        @click="goAnnouncement(item.id)"
      >
        <text class="announce-dot">●</text>
        <text class="announce-text">{{ item.title }}</text>
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="quick-grid">
      <view class="quick-item" @click="goPage('/pages/hall/hall')">
        <text class="quick-icon">🔍</text>
        <text class="quick-label">互助大厅</text>
      </view>
      <view class="quick-item" @click="goPage('/pages/opportunity/publish')">
        <text class="quick-icon">📝</text>
        <text class="quick-label">发布跟单</text>
      </view>
      <view class="quick-item" @click="goPage('/pages/points/index')">
        <text class="quick-icon">⚡</text>
        <text class="quick-label">积分中心</text>
      </view>
      <view class="quick-item" @click="goPage('/pages/community/ranking')">
        <text class="quick-icon">🏆</text>
        <text class="quick-label">排行榜</text>
      </view>
    </view>

    <!-- 我的数据 -->
    <view class="card stats-card" v-if="stats">
      <view class="stat-item">
        <text class="stat-num text-primary">{{ stats.pointsBalance ?? 0 }}</text>
        <text class="stat-label">积分</text>
      </view>
      <view class="stat-item">
        <text class="stat-num text-primary">{{ stats.myOpportunities ?? 0 }}</text>
        <text class="stat-label">我的跟单</text>
      </view>
      <view class="stat-item">
        <text class="stat-num text-primary">{{ stats.creditScore ?? 0 }}</text>
        <text class="stat-label">信用分</text>
      </view>
    </view>

    <view v-if="loading" class="page-loading">加载中...</view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad, onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import { api } from '@/api/index';
import { useUserStore } from '@/store/user';

const userStore = useUserStore();

const announcements = ref([]);
const stats = ref(null);
const loading = ref(false);

const fetchHome = async () => {
  loading.value = true;
  try {
    const [ann, st] = await Promise.all([
      api.announcements(),
      api.myStats(),
    ]);
    announcements.value = Array.isArray(ann) ? ann : ann?.list || [];
    stats.value = st || null;
  } catch (e) {
    // 骨架期静默失败
  } finally {
    loading.value = false;
    uni.stopPullDownRefresh();
  }
};

onLoad(() => {
  fetchHome();
});

onShow(() => {
  if (!userStore.isAuthenticated) return;
  fetchHome();
});

onPullDownRefresh(() => {
  fetchHome();
});

function goAnnouncement(id) {
  uni.navigateTo({ url: `/pages/common/announcement?id=${id}` });
}

function goPage(url) {
  uni.navigateTo({ url });
}
</script>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
}

.home-hero {
  padding: 60rpx 40rpx 50rpx;
  background: linear-gradient(135deg, #048C47 0%, #036B38 100%);
  color: #ffffff;
}

.brand-title {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
}

.brand-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  opacity: 0.9;
}

.home-announce {
  margin: 16rpx 24rpx 0;
  padding: 12rpx 20rpx;
  background: #FFF4E0;
  border-radius: 12rpx;
}

.announce-item {
  display: flex;
  align-items: center;
  padding: 8rpx 0;
}

.announce-dot {
  color: #E8920A;
  font-size: 16rpx;
  margin-right: 12rpx;
}

.announce-text {
  font-size: 26rpx;
  color: #E8920A;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.quick-grid {
  display: flex;
  justify-content: space-between;
  margin: 24rpx;
  padding: 30rpx 20rpx;
  background: #ffffff;
  border-radius: 16rpx;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 25%;
}

.quick-icon {
  font-size: 48rpx;
}

.quick-label {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #1A1A1A;
}

.stats-card {
  display: flex;
  justify-content: space-around;
  padding: 30rpx 20rpx;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 40rpx;
  font-weight: 700;
}

.stat-label {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #7A7A7A;
}

.page-loading {
  text-align: center;
  padding: 40rpx;
  color: #B0B0B0;
}
</style>