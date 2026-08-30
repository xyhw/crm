<template>
  <view class="credit-page">
    <view v-if="loading" class="empty">加载中...</view>
    <template v-else>
      <!-- 信用分卡片 -->
      <view class="credit-card">
        <view class="credit-card__score" :style="{ color: scoreColor }">{{ score }}</view>
        <view class="credit-card__label">{{ scoreLabel }}</view>
        <view class="credit-track">
          <view class="credit-track__bar" :style="{ width: score + '%', background: scoreColor }"></view>
        </view>
      </view>

      <!-- 变动记录 -->
      <view class="section-title">信用分记录</view>
      <view class="section-card">
        <view v-if="!logs.length" class="empty">暂无信用分变动记录</view>
        <view v-else class="log-list">
          <view v-for="log in logs" :key="log.id" class="log-item">
            <view class="log-info">
              <view class="log-reason">{{ log.reason || CHANGE_LABELS[log.sourceType] || '信用分变动' }}</view>
              <view class="log-time">{{ timeAgo(log.createdAt) }}</view>
            </view>
            <text
              class="log-delta"
              :class="log.changeAmount >= 0 ? 'log-delta--up' : 'log-delta--down'"
            >
              {{ log.changeAmount >= 0 ? `+${log.changeAmount}` : log.changeAmount }}
            </text>
          </view>
        </view>
        <view v-if="totalPages > 1" class="pager">
          <view
            class="pager-btn"
            :class="{ disabled: page <= 1 }"
            @click="changePage(page - 1)"
          >上一页</view>
          <view class="pager-info">{{ page }} / {{ totalPages }}</view>
          <view
            class="pager-btn"
            :class="{ disabled: page >= totalPages }"
            @click="changePage(page + 1)"
          >下一页</view>
        </view>
      </view>

      <!-- 说明 -->
      <view class="section-title">信用分说明</view>
      <view class="section-card">
        <view class="rule-row"><text class="rule-text">信用分说明</text><text class="rule-desc">初始 100 分，根据您的行为动态调整</text></view>
        <view class="rule-row"><text class="rule-text">80 分以上</text><text class="rule-desc">正常使用所有功能</text></view>
        <view class="rule-row"><text class="rule-text">60-80 分</text><text class="rule-desc">投稿商机需要审核才能上架</text></view>
        <view class="rule-row"><text class="rule-text">40-60 分</text><text class="rule-desc">禁止投稿，只能购买和跟进</text></view>
        <view class="rule-row"><text class="rule-text">40 分以下</text><text class="rule-desc">账号封禁</text></view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app';
import { api } from '@/api/index';
import { timeAgo } from '@/common/constants';

const CHANGE_LABELS = {
  invalid_mark: '商机被判无效',
  share_report: '分享被举报',
  account_report: '账号被举报',
  purchase: '购买商机',
  share_helpful: '分享被认可',
  weekly_active: '活跃奖励',
  admin_adjust: '管理员调整',
};

const loading = ref(true);
const score = ref(100);
const logs = ref([]);
const page = ref(1);
const total = ref(0);
const pageSize = 6;

onLoad(() => {
  loadCredit();
});

async function loadCredit() {
  loading.value = true;
  page.value = 1;
  try {
    const me = await api.me();
    score.value = me?.creditScore ?? 100;
    await fetchLogs();
  } catch (e) {
    uni.showToast({ title: e.message || '获取信用分失败', icon: 'none' });
  } finally {
    loading.value = false;
    uni.stopPullDownRefresh();
  }
}

onPullDownRefresh(() => {
  loadCredit();
});

async function fetchLogs() {
  const res = await api.credits({ page: page.value, pageSize });
  logs.value = res?.list || [];
  total.value = res?.total ?? logs.value.length;
  return res;
}

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

const scoreColor = computed(() => {
  const s = score.value;
  return s >= 80 ? '#048C47' : s >= 60 ? '#E8920A' : '#E54848';
});

const scoreLabel = computed(() => {
  const s = score.value;
  return s >= 80 ? '信用良好' : s >= 60 ? '信用一般' : '信用较差';
});

async function changePage(p) {
  if (p < 1 || p > totalPages.value) return;
  page.value = p;
  await fetchLogs();
}
</script>

<style lang="scss" scoped>
.credit-page {
  min-height: 100vh;
}

.empty {
  text-align: center;
  padding: 80rpx 0;
  color: #B0B0B0;
  font-size: 28rpx;
}

.credit-card {
  margin: 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 48rpx 40rpx 40rpx;
  text-align: center;
}

.credit-card__score {
  font-size: 72rpx;
  font-weight: 700;
}

.credit-card__label {
  margin-top: 8rpx;
  font-size: 28rpx;
  color: #4A4A4A;
}

.credit-track {
  margin-top: 24rpx;
  height: 12rpx;
  border-radius: 6rpx;
  background: #F2F4F5;
  overflow: hidden;
}

.credit-track__bar {
  height: 100%;
  border-radius: 6rpx;
}

.section-title {
  margin: 8rpx 32rpx 16rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
}

.section-card {
  margin: 0 24rpx 16rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.log-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 0;
  border-bottom: 1px solid #F2F4F5;
}

.log-item:last-child {
  border-bottom: none;
}

.log-reason {
  font-size: 26rpx;
  color: #1A1A1A;
}

.log-time {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #B0B0B0;
}

.log-delta {
  font-size: 28rpx;
  font-weight: 600;
}

.log-delta--up {
  color: #048C47;
}

.log-delta--down {
  color: #E54848;
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

.rule-row {
  padding: 12rpx 0;
}

.rule-text {
  font-size: 26rpx;
  color: #1A1A1A;
  font-weight: 600;
}

.rule-desc {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #7A7A7A;
}
</style>