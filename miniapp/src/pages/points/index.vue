<template>
  <view class="points-page">
    <view v-if="loading" class="empty">加载中...</view>
    <template v-else>
      <!-- 积分余额卡片 -->
      <view class="points-card">
        <view class="points-card__label">当前积分</view>
        <view class="points-card__amount">{{ balance?.balance || 0 }}</view>
        <view class="points-card__stats">
          <text>已充值 {{ balance?.total_recharged || 0 }}</text>
          <text class="stats-sep">·</text>
          <text>已消耗 {{ balance?.total_consumed || 0 }}</text>
        </view>
        <view class="recharge-btn" @click="openRecharge">充值积分</view>
      </view>

      <!-- 快捷入口 -->
      <view class="quick-grid">
        <view class="quick-item" @click="goOrders">
          <text class="quick-icon">购</text>
          <text class="quick-text">购买记录</text>
        </view>
        <view class="quick-item" @click="goInvite">
          <text class="quick-icon">邀</text>
          <text class="quick-text">邀请好友</text>
        </view>
      </view>

      <!-- 流水筛选 -->
      <view class="log-tabs">
        <view
          v-for="t in logTabs"
          :key="t.name"
          class="log-tab"
          :class="{ active: type === t.name }"
          @click="switchType(t.name)"
        >
          {{ t.title }}
        </view>
      </view>

      <!-- 流水列表 -->
      <view class="log-wrap">
        <view v-if="logs.length === 0" class="empty-tip">
          {{ loading ? '加载中...' : '暂无流水记录' }}
        </view>
        <view v-for="log in logs" :key="log.id" class="points-log">
          <view class="log-info">
            <view class="log-title">{{ log.source_title || log.source_type }}</view>
            <view class="log-time">{{ timeAgo(log.created_at) }}</view>
          </view>
          <view class="log-amount" :class="{ negative: log.delta < 0 }">
            {{ log.delta > 0 ? '+' : '' }}{{ log.delta }}
          </view>
        </view>
        <view v-if="logs.length && hasMore" class="load-more" @click="loadMore">加载更多</view>
        <view v-if="logs.length && !hasMore" class="load-more">已经到底了</view>
      </view>
    </template>

    <!-- 充值弹窗 -->
    <view v-if="showRecharge" class="modal-mask" @click.self="showRecharge = false">
      <view class="modal">
        <view class="modal-title">充值积分</view>
        <view class="dialog-label">选择充值金额：</view>
        <view class="recharge-chips">
          <view
            v-for="a in rechargeOptions"
            :key="a"
            class="recharge-chip"
            :class="{ active: Number(rechargeAmount) === a }"
            @click="rechargeAmount = String(a)"
          >
            {{ a }} 积分
          </view>
        </view>
        <view class="custom-row">
          <text class="dialog-label">自定义金额</text>
          <input v-model="rechargeAmount" class="custom-input" type="digit" placeholder="输入积分数量" :maxlength="6" />
        </view>
        <view v-if="payChannel" class="pay-channel-row">
          <text class="dialog-label">支付方式</text>
          <text class="pay-channel-name">{{ channelLabel(payChannel) }}</text>
        </view>
        <view class="modal-actions">
          <view class="modal-btn" @click="showRecharge = false">取消</view>
          <view class="modal-btn modal-btn--primary" :class="{ disabled: recharging }" @click="handleRecharge">
            {{ recharging ? '处理中...' : '确认充值' }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app';
import { api } from '@/api/index';
import { timeAgo } from '@/common/constants';
import { resolveMiniappChannels, channelLabel, checkIosVirtualPayVersion, getWxLoginCode, requestVirtualPayment } from '@/common/payment';

const balance = ref(null);
const logs = ref([]);
const loading = ref(true);
const type = ref('');
const page = ref(1);
const pageSize = 10;
const hasMore = ref(true);
const showRecharge = ref(false);
const rechargeAmount = ref('');
const recharging = ref(false);
const payChannel = ref('');

const logTabs = [
  { title: '全部', name: '' },
  { title: '收入', name: 'income' },
  { title: '支出', name: 'expense' },
];
const rechargeOptions = [50, 100, 200, 500, 1000];

async function fetchLogs(p = 1, reset = false) {
  try {
    const res = await api.pointsLogs({
      type: type.value || undefined,
      page: p,
      pageSize,
    });
    const newList = res.list || [];
    logs.value = reset ? newList : [...logs.value, ...newList];
    hasMore.value = newList.length === pageSize;
    page.value = p;
  } catch (e) {
    uni.showToast({ title: e.message || '获取失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function loadAll() {
  loading.value = true;
  page.value = 1;
  try {
    balance.value = await api.pointsBalance();
  } catch (e) {}
  await fetchLogs(1, true);
}

function switchType(value) {
  if (type.value === value) return;
  type.value = value;
  loadAll();
}

async function loadMore() {
  if (!hasMore.value || loading.value) return;
  await fetchLogs(page.value + 1);
}

function openRecharge() {
  rechargeAmount.value = '';
  showRecharge.value = true;
  // 预取小程序可用渠道（wechat/mock），避免创建 waffo 等 redirect 订单在小程序内无意义
  if (!payChannel.value) {
    resolveMiniappChannels().then((info) => {
      payChannel.value = info.channel;
    });
  }
}

function goOrders() {
  uni.navigateTo({ url: '/pages/order/list' });
}

function goInvite() {
  uni.navigateTo({ url: '/pages/community/invite' });
}

async function handleRecharge() {
  const amount = Number(rechargeAmount.value);
  if (!amount || amount <= 0) {
    uni.showToast({ title: '请输入有效金额', icon: 'none' });
    return;
  }
  if (amount > 10000) {
    uni.showToast({ title: '单次充值上限10000积分', icon: 'none' });
    return;
  }
  if (recharging.value) return;
  if (payChannel.value === 'wechat' && !checkIosVirtualPayVersion()) return;
  recharging.value = true;
  try {
    let wxCode;
    if (payChannel.value === 'wechat') {
      wxCode = await getWxLoginCode();
    }
    const order = await api.recharge({ amount, channel: payChannel.value, code: wxCode });

    if ((order.payMethod === 'virtual' || order.payMethod === 'jsapi') && (order.payData || order.payload)) {
      uni.showLoading({ title: '拉起支付中' });
      try {
        await requestVirtualPayment(order.payData || order.payload);
        uni.hideLoading();
      } catch (payErr) {
        uni.hideLoading();
        showRecharge.value = false;
        uni.redirectTo({
          url: `/pages/points/result?status=failed&message=${encodeURIComponent(payErr?.errMsg || '支付未完成')}`,
        });
        return;
      }
    } else if (order.channel === 'mock' && order.payMethod !== 'auto') {
      await api.rechargeMockPay(order.orderNo);
    }

    // 轮询订单状态
    const finalOrder = await pollOrderStatus(order.orderNo);
    showRecharge.value = false;
    uni.redirectTo({
      url: `/pages/points/result?status=success&amount=${finalOrder.amount}`,
    });
    loadAll();
  } catch (e) {
    const reason = e.message || '';
    if (reason.includes('失败')) {
      uni.redirectTo({
        url: `/pages/points/result?status=failed&message=${encodeURIComponent(reason)}`,
      });
    } else if (reason.includes('超时') || reason.includes('未完成') || reason.includes('请重新发起')) {
      uni.redirectTo({
        url: `/pages/points/result?status=expired&message=${encodeURIComponent(reason)}`,
      });
    } else {
      uni.showToast({ title: reason, icon: 'none' });
    }
  } finally {
    recharging.value = false;
  }
}

function pollOrderStatus(orderNo, times = 90, interval = 2000) {
  return new Promise((resolve, reject) => {
    let count = 0;
    const timer = setInterval(async () => {
      count += 1;
      try {
        const order = await api.rechargeOrderStatus(orderNo);
        if (order.status === 'paid') {
          clearInterval(timer);
          resolve(order);
        } else if (order.status === 'failed' || order.status === 'expired') {
          clearInterval(timer);
          reject(new Error(order.status === 'failed' ? '支付失败，积分未到账' : '支付超时，订单已失效'));
        } else if (count >= times) {
          clearInterval(timer);
          reject(new Error('支付未完成，请重新发起充值'));
        }
      } catch (e) {
        if (count >= times) {
          clearInterval(timer);
          reject(new Error('查询订单状态失败'));
        }
      }
    }, interval);
  });
}

onLoad(() => {
  loadAll();
});

onPullDownRefresh(async () => {
  await loadAll();
  uni.stopPullDownRefresh();
});

onReachBottom(() => {
  loadMore();
});
</script>

<style lang="scss" scoped>
.points-page {
  min-height: 100vh;
}

.empty {
  text-align: center;
  padding: 120rpx 0;
  color: #B0B0B0;
  font-size: 28rpx;
}

/* 余额卡片 */
.points-card {
  margin: 16rpx 24rpx;
  background: linear-gradient(135deg, #048C47, #06A85A);
  border-radius: 20rpx;
  padding: 40rpx 32rpx;
  color: #ffffff;
  position: relative;
}

.points-card__label {
  font-size: 26rpx;
  color: #E4F7EC;
}

.points-card__amount {
  font-size: 72rpx;
  font-weight: 700;
  margin: 12rpx 0;
}

.points-card__stats {
  font-size: 24rpx;
  color: #E4F7EC;
}

.stats-sep {
  margin: 0 8rpx;
}

.recharge-btn {
  position: absolute;
  right: 32rpx;
  bottom: 40rpx;
  padding: 12rpx 40rpx;
  background: #ffffff;
  color: #048C47;
  font-size: 26rpx;
  border-radius: 40rpx;
}

/* 快捷入口 */
.quick-grid {
  display: flex;
  margin: 0 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx 0;
}

.quick-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.quick-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #E4F7EC;
  color: #048C47;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-text {
  font-size: 24rpx;
  color: #1A1A1A;
  margin-top: 8rpx;
}

/* 流水 */
.log-tabs {
  display: flex;
  margin: 16rpx 24rpx 0;
}

.log-tab {
  padding: 16rpx 32rpx;
  font-size: 26rpx;
  color: #7A7A7A;
}

.log-tab.active {
  color: #048C47;
  font-weight: 600;
}

.log-wrap {
  margin: 0 24rpx 16rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 8rpx 24rpx;
}

.points-log {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1px solid #F2F4F5;
}

.points-log:last-child {
  border-bottom: none;
}

.log-title {
  font-size: 28rpx;
  color: #1A1A1A;
}

.log-time {
  font-size: 22rpx;
  color: #B0B0B0;
  margin-top: 4rpx;
}

.log-amount {
  font-size: 30rpx;
  font-weight: 600;
  color: #048C47;
}

.log-amount.negative {
  color: #E54848;
}

.empty-tip {
  text-align: center;
  padding: 60rpx 0;
  color: #B0B0B0;
  font-size: 26rpx;
}

.load-more {
  text-align: center;
  padding: 20rpx;
  color: #B0B0B0;
  font-size: 24rpx;
}

/* 充值弹窗 */
.modal-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 200;
}

.modal {
  width: 100%;
  background: #ffffff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx 24rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
}

.modal-title {
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 24rpx;
}

.dialog-label {
  font-size: 26rpx;
  color: #4A4A4A;
}

.recharge-chips {
  display: flex;
  flex-wrap: wrap;
  margin: 16rpx 0 8rpx;
}

.recharge-chip {
  padding: 14rpx 32rpx;
  margin: 0 16rpx 16rpx 0;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #7A7A7A;
  background: #F2F4F5;
}

.recharge-chip.active {
  color: #ffffff;
  background: #048C47;
}

.custom-row {
  display: flex;
  align-items: center;
  margin-top: 8rpx;
}

.custom-input {
  flex: 1;
  height: 64rpx;
  line-height: 64rpx;
  background: #F2F4F5;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
  margin-left: 16rpx;
}

.pay-channel-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24rpx;
  padding: 20rpx;
  background: #F7FBF8;
  border-radius: 12rpx;
}

.pay-channel-name {
  font-size: 26rpx;
  color: #048C47;
  font-weight: 500;
}

.modal-actions {
  display: flex;
  margin-top: 28rpx;
}

.modal-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  border-radius: 40rpx;
  background: #F2F4F5;
  color: #4A4A4A;
  font-size: 30rpx;
  margin-left: 16rpx;
}

.modal-btn:first-child {
  margin-left: 0;
}

.modal-btn--primary {
  background: #048C47;
  color: #ffffff;
}

.modal-btn--primary.disabled {
  opacity: 0.6;
}
</style>