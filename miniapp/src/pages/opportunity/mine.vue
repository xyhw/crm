<template>
  <view class="my-opp-page">
    <view v-if="loading && list.length === 0" class="empty">加载中...</view>
    <view v-else-if="list.length === 0" class="empty-box">
      <text class="empty-text">还没有发布过商机</text>
      <view class="publish-btn" @click="goPublish">立即发布</view>
    </view>
    <view v-else>
      <view v-for="item in list" :key="item.id" class="my-opp-card" @click="goDetail(item.id)">
        <view class="card-head">
          <text class="status-tag" :class="statusTone(item.status)">{{ statusLabel(item.status) }}</text>
          <text class="card-time">{{ item.createdAt ? item.createdAt.slice(0, 10) : '' }}</text>
        </view>
        <view class="card-title">{{ item.title }}</view>
        <view class="card-meta">
          <text>{{ item.hotelName || item.brand || '未知品牌' }} · {{ item.city || '未知城市' }}</text>
          <text v-if="item.stage" class="stage-tag" :class="stageTone(item.stage)">{{ stageLabel(item.stage) }}</text>
        </view>
        <view class="card-stats">
          <text>{{ item.price }} 积分</text>
          <text>{{ item.purchaseCount || 0 }}人已购</text>
          <text>{{ item.viewCount || 0 }}次浏览</text>
        </view>
        <view class="card-actions">
          <view v-if="editable(item)" class="edit-btn" @click.stop="goEdit(item.id)">编辑</view>
          <text v-else class="locked-text">{{ item.status === 'invalid' ? '已被判无效' : '已有购买者' }}</text>
        </view>
      </view>

      <!-- 固定分页导航 -->
      <view v-if="pageCount > 1" class="pager">
        <view class="pager-btn" :class="{ disabled: page <= 1 }" @click="goPage(page - 1)">上一页</view>
        <view
          v-for="p in pageItems"
          :key="p"
          class="pager-num"
          :class="{ active: p === page }"
          @click="goPage(p)"
        >{{ p }}</view>
        <view class="pager-btn" :class="{ disabled: page >= pageCount }" @click="goPage(page + 1)">下一页</view>
      </view>
      <view class="pager-total">共 {{ total }} 条 · {{ page }} / {{ pageCount }} 页</view>
    </view>

    <!-- 底部主导航栏 -->
    <CustomTabBar active-tab="我的" />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import { api } from '@/api/index';
import { stageLabel, stageTone } from '@/common/constants';
import CustomTabBar from '@/components/CustomTabBar.vue';

const list = ref([]);
const loading = ref(false);
const page = ref(1);
const total = ref(0);
const pageSize = 10;

const STATUS_META = {
  active: { label: '销售中', tone: 'verified' },
  inactive: { label: '已下架', tone: 'default' },
  invalid: { label: '已失效', tone: 'hot' },
};

function statusLabel(status) {
  return (STATUS_META[status] || STATUS_META.active).label;
}
function statusTone(status) {
  return (STATUS_META[status] || STATUS_META.active).tone;
}
function editable(item) {
  return item.status !== 'invalid' && (item.purchaseCount || 0) === 0;
}

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

// 显示页码序列：最多 5 个，含省略
const pageItems = computed(() => {
  const totalPages = pageCount.value;
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const current = page.value;
  const pages = new Set([1, totalPages, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) result.push('...');
    result.push(p);
    prev = p;
  }
  return result;
});

async function fetchList(p) {
  try {
    const res = await api.myOpportunities({ page: p, pageSize });
    list.value = res.list || [];
    total.value = res.total || 0;
    page.value = p;
  } catch (e) {
    uni.showToast({ title: e.message || '获取失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function load() {
  loading.value = true;
  await fetchList(1);
}

function goPage(p) {
  if (p < 1 || p > pageCount.value || p === page.value) return;
  loading.value = true;
  fetchList(p);
}

onShow(load);
onPullDownRefresh(async () => {
  await load();
  uni.stopPullDownRefresh();
});

function goPublish() {
  uni.navigateTo({ url: '/pages/opportunity/publish' });
}
function goDetail(id) {
  uni.navigateTo({ url: `/pages/opportunity/detail?id=${id}` });
}
function goEdit(id) {
  uni.navigateTo({ url: `/pages/opportunity/publish?edit=${id}` });
}
</script>

<style lang="scss" scoped>
.my-opp-page {
  min-height: 100vh;
  padding: 16rpx 24rpx calc(110px + env(safe-area-inset-bottom));
}

.empty {
  padding: 120rpx 0;
  text-align: center;
  color: #B0B0B0;
  font-size: 28rpx;
}

.empty-box {
  padding: 160rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-text {
  font-size: 28rpx;
  color: #B0B0B0;
  margin-bottom: 32rpx;
}

.publish-btn {
  padding: 20rpx 64rpx;
  border-radius: 44rpx;
  background: #048C47;
  color: #ffffff;
  font-size: 30rpx;
}

.my-opp-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 16rpx;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.status-tag {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  color: #7A7A7A;
  background: #F2F4F5;
}
.status-tag.verified {
  color: #048C47;
  background: #E4F7EC;
}
.status-tag.hot {
  color: #E54848;
  background: #FDECEC;
}

.card-time {
  font-size: 22rpx;
  color: #B0B0B0;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 12rpx;
}

.card-meta {
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: #7A7A7A;
  margin-bottom: 12rpx;
}

.stage-tag {
  margin-left: 12rpx;
  font-size: 20rpx;
  border-radius: 8rpx;
  padding: 2rpx 10rpx;
  color: #7A7A7A;
  background: #F2F4F5;
}
.stage-tag.hot {
  color: #E54848;
  background: #FDECEC;
}
.stage-tag.warm {
  color: #E8920A;
  background: #FFF4E0;
}
.stage-tag.verified {
  color: #048C47;
  background: #E4F7EC;
}

.card-stats {
  display: flex;
  font-size: 22rpx;
  color: #555555;
  margin-bottom: 16rpx;
}
.card-stats text {
  margin-right: 24rpx;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
}

.edit-btn {
  padding: 8rpx 32rpx;
  border-radius: 32rpx;
  border: 1px solid #048C47;
  color: #048C47;
  font-size: 24rpx;
}

.locked-text {
  font-size: 24rpx;
  color: #B0B0B0;
}

/* 固定分页导航 */
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 24rpx;
}
.pager-btn {
  padding: 8rpx 24rpx;
  border: 1px solid #DDDDDD;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #333333;
  background: #ffffff;
}
.pager-btn.disabled {
  color: #C0C0C0;
  border-color: #EEEEEE;
  background: #F7F8F9;
}
.pager-num {
  min-width: 56rpx;
  height: 56rpx;
  line-height: 56rpx;
  text-align: center;
  margin: 0 8rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #333333;
  background: #ffffff;
  border: 1px solid transparent;
}
.pager-num.active {
  color: #ffffff;
  background: #048C47;
  border-color: #048C47;
}
.pager-total {
  text-align: center;
  margin: 16rpx 0 8rpx;
  font-size: 24rpx;
  color: #B0B0B0;
}
</style>