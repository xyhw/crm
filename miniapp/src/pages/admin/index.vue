<template>
  <view class="admin-page">
    <view class="admin-header">
      <view class="admin-title">商机管理后台</view>
      <view class="admin-user">
        <text>{{ adminUser?.username || '管理员' }}</text>
        <text class="logout-btn" @click="handleLogout">退出</text>
      </view>
    </view>

    <view class="menu-grid">
      <view v-for="item in menus" :key="item.path" class="menu-item" @click="go(item.path)">
        <view class="menu-icon" :style="{ background: item.color }">{{ item.icon }}</view>
        <text class="menu-label">{{ item.label }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getAdminUser, clearAdminAuth, getAdminToken } from '@/admin/adminApi';

const adminUser = ref(null);

const menus = [
  { path: '/pages/admin/dashboard', icon: '板', label: '仪表盘', color: '#048C47' },
  { path: '/pages/admin/opportunities', icon: '商', label: '商机管理', color: '#048C47' },
  { path: '/pages/admin/opportunities/import', icon: '导', label: '批量导入', color: '#6B4DE6' },
  { path: '/pages/admin/users', icon: '户', label: '用户管理', color: '#1B7FE0' },
  { path: '/pages/admin/orders', icon: '单', label: '订单管理', color: '#E8920A' },
  { path: '/pages/admin/points', icon: '分', label: '积分管理', color: '#E54848' },
  { path: '/pages/admin/audit', icon: '审', label: '进度审核', color: '#D96C2A' },
  { path: '/pages/admin/levels', icon: '级', label: '等级配置', color: '#8B5CF6' },
  { path: '/pages/admin/configs', icon: '配', label: '系统配置', color: '#64748B' },
  { path: '/pages/admin/configs/agreements', icon: '议', label: '协议内容', color: '#0EA5E9' },
  { path: '/pages/admin/stats', icon: '统', label: '数据统计', color: '#10B981' },
  { path: '/pages/admin/roles', icon: '角', label: '角色管理', color: '#3B82F6' },
  { path: '/pages/admin/audit-logs', icon: '志', label: '操作日志', color: '#6366F1' },
  { path: '/pages/admin/announcements', icon: '告', label: '公告管理', color: '#F59E0B' },
  { path: '/pages/admin/banners', icon: '图', label: 'Banner管理', color: '#EC4899' },
  { path: '/pages/admin/notifications', icon: '知', label: '通知推送', color: '#06B6D4' },
  { path: '/pages/admin/admins', icon: '员', label: '管理员', color: '#F97316' },
  { path: '/pages/admin/finance', icon: '财', label: '财务看板', color: '#14B8A6' },
  { path: '/pages/admin/categories', icon: '类', label: '分类管理', color: '#84CC16' },
  { path: '/pages/admin/tags', icon: '签', label: '标签管理', color: '#A855F7' },
];

onShow(() => {
  adminUser.value = getAdminUser();
  if (!getAdminToken()) {
    uni.reLaunch({ url: '/pages/admin/login' });
  }
});

function go(path) {
  uni.navigateTo({ url: path });
}

function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确认退出登录？',
    success: (res) => {
      if (res.confirm) {
        clearAdminAuth();
        uni.reLaunch({ url: '/pages/admin/login' });
      }
    },
  });
}
</script>

<style lang="scss" scoped>
.admin-page {
  min-height: 100vh;
  background: #F2F4F5;
}
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx 24rpx;
  background: #ffffff;
}
.admin-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1A1A1A;
}
.admin-user {
  display: flex;
  align-items: center;
  font-size: 26rpx;
  color: #555555;
}
.logout-btn {
  margin-left: 24rpx;
  color: #E54848;
}
.menu-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 24rpx;
}
.menu-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 0;
  background: #ffffff;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  margin-right: 1.33%;
}
.menu-item:nth-child(4n) {
  margin-right: 0;
}
.menu-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  color: #ffffff;
  font-size: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}
.menu-label {
  font-size: 24rpx;
  color: #333333;
}
</style>