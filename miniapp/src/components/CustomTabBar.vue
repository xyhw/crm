<template>
  <view class="custom-tabbar">
    <view
      v-for="tab in tabs"
      :key="tab.path"
      class="tabbar-item"
      :class="{ active: tab.name === activeTab }"
      @click="switchTab(tab.path)"
    >
      <text class="tabbar-label">{{ tab.label }}</text>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  activeTab: { type: String, default: '我的' },
});

const tabs = [
  { path: '/pages/index/index', label: '首页', name: '首页' },
  { path: '/pages/hall/hall', label: '大厅', name: '大厅' },
  { path: '/pages/opportunity/publish', label: '发布', name: '发布' },
  { path: '/pages/crm/index', label: 'CRM', name: 'CRM' },
  { path: '/pages/profile/index', label: '我的', name: '我的' },
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
  align-items: center;
  justify-content: center;
  height: 50px;
}
.tabbar-label {
  font-size: 16px;
  color: #555555;
}
.tabbar-item.active .tabbar-label {
  color: #037539;
  font-weight: 500;
}
</style>