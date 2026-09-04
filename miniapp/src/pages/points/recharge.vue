<template>
  <view class="recharge-page">
    <view v-if="loading" class="empty">加载中...</view>
    <template v-else>
      <!-- 渠道选择 -->
      <view class="section-card">
        <view class="section-title">选择支付方式</view>
        <view
          v-for="c in availableChannels"
          :key="c"
          class="channel-item"
          :class="{ active: channel === c }"
          @click="channel = c"
        >
          <text class="channel-name">{{ channelLabel(c) }}</text>
          <text class="channel-desc">{{ channelDesc(c) }}</text>
        </view>
        <view v-if="!availableChannels.length" class="empty-tip">暂无可用的支付方式</view>
      </view>

      <!-- 金额选择 -->
      <view class="section-card">
        <view class="section-title">选择充值金额</view>
        <view class="amount-chips">
          <view
            v-for="a in options"
            :key="a"
            class="amount-chip"
            :class="{ active: Number(amount) === a }"
            @click="amount = String(a)"
          >
            {{ a }} 积分
          </view>
        </view>
        <view class="custom-row">
          <text class="custom-label">自定义金额</text>
          <input v-model="amount" class="custom-input" type="digit" placeholder="输入积分数量" :maxlength="6" />
        </view>
        <view class="section-tip">单次充值上限 10000 积分</view>
      </view>

      <view class="submit-btn" :class="{ disabled: submitting }" @click="handleRecharge">
        {{ submitting ? '处理中...' : `确认充值 ${amount || 0} 积分` }}
      </view>

      <!-- JSAPI 支付确认（wechat 渠道 wx.requestPayment 拉起） -->
      <view v-if="showPayDetail" class="modal-mask" @click.self="showPayDetail = false">
        <view class="modal">
          <view class="modal-title">支付订单</view>
          <view class="pay-order-row"><text>订单号</text><text>{{ orderNo }}</text></view>
          <view class="pay-order-row"><text>金额</text><text>{{ amount }} 积分</text></view>
          <view class="pay-order-row"><text>渠道</text><text>{{ channelLabel(channel) }}</text></view>
          <view class="dialog-tip">
            {{ channel === 'mock' ? '开发环境模拟支付，点击确认模拟完成支付' : '即将拉起微信虚拟支付收银台' }}
          </view>
          <view class="modal-actions">
            <view class="modal-btn" @click="showPayDetail = false">取消</view>
            <view class="modal-btn modal-btn--primary" :class="{ disabled: submitting }" @click="confirmPay">
              {{ submitting ? '处理中...' : '确认' }}
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { api } from '@/api/index';
import { resolveMiniappChannels, channelLabel, checkIosVirtualPayVersion, getWxLoginCode, requestVirtualPayment } from '@/common/payment';

const options = [50, 100, 200, 500, 1000];
const MAX_AMOUNT = 10000;

const loading = ref(true);
const availableChannels = ref(['mock']);
const channel = ref('mock');
const amount = ref('');
const submitting = ref(false);
const showPayDetail = ref(false);
const orderNo = ref('');

function channelDesc(c) {
  const desc = {
    mock: '开发环境模拟支付',
    wechat: '微信虚拟支付（道具直购）',
  };
  return desc[c] || '';
}

onLoad(async () => {
  const info = await resolveMiniappChannels();
  availableChannels.value = info.channels;
  channel.value = availableChannels.value[0] || 'mock';
  loading.value = false;
});

async function handleRecharge() {
  const value = Number(amount.value);
  if (!value || value <= 0) {
    uni.showToast({ title: '请输入有效金额', icon: 'none' });
    return;
  }
  if (value > MAX_AMOUNT) {
    uni.showToast({ title: `单次充值上限${MAX_AMOUNT}积分`, icon: 'none' });
    return;
  }
  if (submitting.value) return;
  if (channel.value === 'wechat' && !checkIosVirtualPayVersion()) return;
  submitting.value = true;
  try {
    let wxCode;
    if (channel.value === 'wechat') {
      wxCode = await getWxLoginCode();
    }
    const order = await api.recharge({ amount: value, channel: channel.value, code: wxCode });
    orderNo.value = order.orderNo;
    amount.value = String(value);

    if ((order.payMethod === 'virtual' || order.payMethod === 'jsapi') && (order.payData || order.payload)) {
      uni.showLoading({ title: '拉起支付中' });
      try {
        await requestVirtualPayment(order.payData || order.payload);
        uni.hideLoading();
      } catch (payErr) {
        uni.hideLoading();
        uni.redirectTo({
          url: `/pages/points/result?status=failed&message=${encodeURIComponent(payErr?.errMsg || '支付未完成')}`,
        });
        return;
      }
      const paid = await pollOrderStatus(order.orderNo);
      uni.redirectTo({ url: `/pages/points/result?status=success&amount=${paid.amount}` });
      return;
    } else if (order.payMethod === 'redirect' && order.payUrl) {
      // H5 托管收银台：跳转后由轮询页/回跳确认结果
      // #ifdef H5
      window.location.href = order.payUrl;
      // #endif
      // #ifndef H5
      uni.showToast({ title: '当前端不支持该支付方式', icon: 'none' });
      // #endif
      return;
    } else {
      // mock 或 autopay：展示确认并模拟完成
      showPayDetail.value = true;
    }
  } catch (e) {
    uni.showToast({ title: e.message || '创建订单失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}

async function confirmPay() {
  if (submitting.value) return;
  submitting.value = true;
  try {
    if (channel.value === 'mock') {
      await api.rechargeMockPay(orderNo.value);
    }
    const order = await pollOrderStatus(orderNo.value);
    uni.showToast({ title: `充值成功，到账 ${order.amount} 积分`, icon: 'none' });
    uni.redirectTo({ url: '/pages/points/result?status=success' });
  } catch (e) {
    const reason = e.message || '';
    if (reason.includes('失败')) {
      uni.redirectTo({ url: `/pages/points/result?status=failed&message=${encodeURIComponent(reason)}` });
    } else {
      uni.redirectTo({ url: `/pages/points/result?status=expired&message=${encodeURIComponent(reason)}` });
    }
  } finally {
    submitting.value = false;
    showPayDetail.value = false;
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
</script>

<style lang="scss" scoped>
.recharge-page {
  min-height: 100vh;
}

.empty {
  text-align: center;
  padding: 120rpx 0;
  color: #B0B0B0;
  font-size: 28rpx;
}

.section-card {
  margin: 16rpx 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 16rpx;
}

.channel-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  border: 1px solid #E0E6E2;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
}

.channel-item.active {
  border-color: #048C47;
  background: #F3FBF6;
}

.channel-name {
  font-size: 28rpx;
  color: #1A1A1A;
  margin-right: 16rpx;
}

.channel-desc {
  font-size: 22rpx;
  color: #7A7A7A;
}

.channel-item.active .channel-name {
  color: #048C47;
}

.amount-chips {
  display: flex;
  flex-wrap: wrap;
}

.amount-chip {
  padding: 14rpx 32rpx;
  margin: 0 16rpx 16rpx 0;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #7A7A7A;
  background: #F2F4F5;
}

.amount-chip.active {
  color: #ffffff;
  background: #048C47;
}

.custom-row {
  display: flex;
  align-items: center;
  margin-top: 8rpx;
}

.custom-label {
  font-size: 26rpx;
  color: #4A4A4A;
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

.section-tip {
  font-size: 22rpx;
  color: #B0B0B0;
  margin-top: 12rpx;
}

.submit-btn {
  margin: 32rpx 24rpx;
  height: 92rpx;
  line-height: 92rpx;
  text-align: center;
  border-radius: 46rpx;
  background: #048C47;
  color: #ffffff;
  font-size: 30rpx;
}

.submit-btn.disabled {
  opacity: 0.6;
}

/* 支付确认弹窗 */
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

.pay-order-row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  font-size: 26rpx;
  color: #4A4A4A;
}

.dialog-tip {
  font-size: 22rpx;
  color: #B0B0B0;
  margin-top: 12rpx;
  line-height: 1.5;
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

.empty-tip {
  text-align: center;
  padding: 40rpx 0;
  color: #B0B0B0;
  font-size: 26rpx;
}
</style>