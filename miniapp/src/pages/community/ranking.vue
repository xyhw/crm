<template>
  <view class="ranking-page">
    <!-- Tab 切换 -->
    <view class="rank-tabs">
      <view
        v-for="t in tabs"
        :key="t.name"
        class="rank-tab"
        :class="{ active: type === t.name }"
        @click="switchType(t.name)"
      >
        {{ t.title }}
      </view>
    </view>

    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="!list.length" class="empty">暂无排行数据</view>
    <view v-else class="rank-list">
      <view v-for="item in visible" :key="item.id" class="rank-item">
        <view class="rank-no" :class="{ 'rank-no--top': item.rank <= 3 }">{{ item.rank }}</view>
        <view class="rank-avatar">{{ item.nickname?.[0] || '匿' }}</view>
        <view class="rank-info">
          <view class="rank-name">{{ item.nickname || '匿名用户' }}</view>
          <view class="rank-score">
            {{ type === 'publisher' ? `${item.purchase_count || 0} 次购买` : `${item.helpful_count || 0} 次有用` }}
          </view>
        </view>
      </view>
      <view v-if="totalPages > 1" class="pager">
        <view class="pager-btn" :class="{ disabled: page <= 1 }" @click="changePage(page - 1)">上一页</view>
        <view class="pager-info">{{ page }} / {{ totalPages }}</view>
        <view class="pager-btn" :class="{ disabled: page >= totalPages }" @click="changePage(page + 1)">下一页</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { api } from '@/api/index';

const tabs = [
  { title: '商机达人榜', name: 'publisher' },
  { title: '贡献榜', name: 'contributor' },
];

const type = ref('publisher');
const list = ref([]);
const loading = ref(true);
const page = ref(1);
const pageSize = 6;

onLoad(() => {
  fetchRank();
});

onShareAppMessage(() => {
  const typeName = type.value === 'publisher' ? '商机达人榜' : '贡献榜';
  return {
    title: `商机互助 ${typeName}`,
    path: '/pages/community/ranking',
  };
});

function switchType(name) {
  if (type.value === name) return;
  type.value = name;
  page.value = 1;
  fetchRank();
}

async function fetchRank() {
  loading.value = true;
  page.value = 1;
  try {
    const res = await api.rankings({ type: type.value, pageSize: 50 });
    list.value = res?.list || [];
  } catch (e) {
    list.value = [];
    uni.showToast({ title: e.message || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
    uni.stopPullDownRefresh();
  }
}

const totalPages = computed(() => Math.ceil(list.value.length / pageSize));
const visible = computed(() => {
  const start = (page.value - 1) * pageSize;
  return list.value.slice(start, start + pageSize);
});

function changePage(p) {
  if (p < 1 || p > totalPages.value) return;
  page.value = p;
}
</script>

<style lang="scss" scoped>
.ranking-page {
  min-height: 100vh;
}

.rank-tabs {
  display: flex;
  background: #ffffff;
  padding: 0 24rpx;
}

.rank-tab {
  position: relative;
  padding: 24rpx 32rpx;
  font-size: 28rpx;
  color: #7A7A7A;
}

.rank-tab.active {
  color: #048C47;
  font-weight: 600;
}

.rank-tab.active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 40rpx;
  height: 6rpx;
  border-radius: 3rpx;
  background: #048C47;
}

.empty {
  text-align: center;
  padding: 120rpx 0;
  color: #B0B0B0;
  font-size: 28rpx;
}

.rank-list {
  padding: 0 24rpx;
}

.rank-item {
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 16rpx;
  margin-top: 16rpx;
  padding: 24rpx;
}

.rank-no {
  width: 56rpx;
  height: 56rpx;
  line-height: 56rpx;
  text-align: center;
  border-radius: 50%;
  background: #F2F4F5;
  color: #7A7A7A;
  font-size: 28rpx;
  font-weight: 700;
}

.rank-no--top {
  background: #E8920A;
  color: #ffffff;
}

.rank-avatar {
  width: 72rpx;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  border-radius: 50%;
  background: #E4F7EC;
  color: #048C47;
  font-size: 30rpx;
  margin-left: 20rpx;
}

.rank-info {
  margin-left: 20rpx;
}

.rank-name {
  font-size: 28rpx;
  color: #1A1A1A;
}

.rank-score {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #7A7A7A;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx 0 8rpx;
}

.pager-btn {
  padding: 10rpx 32rpx;
  border-radius: 8rpx;
  border: 1px solid #048C47;
  color: #048C47;
  font-size: 24rpx;
}

.pager-btn.disabled {
  opacity: 0.4;
}

.pager-info {
  margin: 0 24rpx;
  font-size: 24rpx;
  color: #7A7A7A;
}
</style>