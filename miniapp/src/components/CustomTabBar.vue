<template>
  <view class="custom-tabbar">
    <view
      v-for="tab in tabs"
      :key="tab.path"
      class="tabbar-item"
      :class="{ active: tab.name === activeTab }"
      @click="switchTab(tab.path)"
    >
      <image
        class="tabbar-icon"
        :src="tab.name === activeTab ? tab.activeIcon : tab.icon"
        mode="aspectFit"
      />
      <text class="tabbar-label">{{ tab.label }}</text>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  activeTab: { type: String, default: '我的' },
});

// 图标与 pages.json 的原生 tabBar 保持同一套资源
const tabs = [
  { path: '/pages/index/index', label: '首页', name: '首页', icon: '/static/tabbar/home.png', activeIcon: '/static/tabbar/home-active.png' },
  { path: '/pages/hall/hall', label: '大厅', name: '大厅', icon: '/static/tabbar/hall.png', activeIcon: '/static/tabbar/hall-active.png' },
  { path: '/pages/opportunity/publish', label: '发布', name: '发布', icon: '/static/tabbar/publish.png', activeIcon: '/static/tabbar/publish-active.png' },
  { path: '/pages/crm/index', label: 'CRM', name: 'CRM', icon: '/static/tabbar/crm.png', activeIcon: '/static/tabbar/crm-active.png' },
  { path: '/pages/profile/index', label: '我的', name: '我的', icon: '/static/tabbar/mine.png', activeIcon: '/static/tabbar/mine-active.png' },
];

function switchTab(path) {
  uni.switchTab({ url: path });
}
</script>

<style lang="scss" scoped>
.custom-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: #ffffff;
  border-top: 1px solid #eee;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 999;
  height: 50px;
}
.tabbar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50px;
}
.tabbar-icon {
  width: 22px;
  height: 22px;
  margin-bottom: 2px;
}
.tabbar-label {
  font-size: 11px;
  line-height: 1.2;
  color: #7A7A7A;
}
.tabbar-item.active .tabbar-label {
  color: #048C47;
  font-weight: 500;
}
</style>