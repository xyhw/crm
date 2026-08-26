<template>
  <view class="share-page">
    <view class="form-card">
      <view class="dialog-label">选择进度状态：</view>
      <view class="status-chips">
        <view
          v-for="s in FOLLOW_UP_STATUS"
          :key="s.value"
          class="status-chip"
          :class="{ active: form.status === s.value }"
          @click="form.status = s.value"
        >
          {{ s.label }}
        </view>
      </view>

      <textarea
        v-model="form.summary"
        class="share-input"
        placeholder="一句话描述进度（匿名展示）"
        :maxlength="200"
      />

      <view class="dialog-tip">您共享的进度将匿名展示在共享进度榜，帮助其他购买者判断商机价值。</view>
      <view class="dialog-reward">奖励规则：共享通过审核 +2 积分；情报被点赞 +1 积分</view>
    </view>

    <view class="submit-btn" :class="{ disabled: submitting }" @click="handleShare">
      {{ submitting ? '提交中...' : '共享进度' }}
    </view>
  </view>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { api } from '@/api/index';
import { FOLLOW_UP_STATUS } from '@/common/constants';

const opportunityId = ref('');
const crmId = ref('');
const submitting = ref(false);
const form = reactive({
  status: 'call_no_answer',
  summary: '',
});

onLoad((options) => {
  opportunityId.value = options.opportunityId || '';
  crmId.value = options.crmId || '';
});

async function handleShare() {
  if (!form.summary.trim()) {
    uni.showToast({ title: '请填写进度情报', icon: 'none' });
    return;
  }
  if (submitting.value) return;
  submitting.value = true;
  try {
    await api.shareFollowUp({
      opportunityId: Number(opportunityId.value),
      status: form.status,
      summary: form.summary.trim(),
    });
    uni.showToast({ title: '分享成功', icon: 'none' });
    setTimeout(() => {
      if (crmId.value) {
        uni.redirectTo({ url: `/pages/crm/detail?id=${crmId.value}` });
      } else {
        uni.navigateBack();
      }
    }, 800);
  } catch (e) {
    uni.showToast({ title: e.message || '分享失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}
</script>

<style lang="scss" scoped>
.share-page {
  min-height: 100vh;
}

.form-card {
  margin: 16rpx 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx 24rpx;
}

.dialog-label {
  font-size: 28rpx;
  color: #1A1A1A;
}

.status-chips {
  display: flex;
  flex-wrap: wrap;
  margin-top: 16rpx;
}

.status-chip {
  padding: 12rpx 28rpx;
  margin: 0 16rpx 16rpx 0;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #7A7A7A;
  background: #F2F4F5;
}

.status-chip.active {
  color: #ffffff;
  background: #048C47;
}

.share-input {
  width: 100%;
  box-sizing: border-box;
  height: 160rpx;
  background: #F2F4F5;
  border-radius: 12rpx;
  padding: 16rpx;
  font-size: 28rpx;
  margin-top: 8rpx;
  line-height: 1.5;
}

.dialog-tip {
  font-size: 24rpx;
  color: #B0B0B0;
  margin-top: 16rpx;
  line-height: 1.5;
}

.dialog-reward {
  font-size: 24rpx;
  color: #E8920A;
  margin-top: 8rpx;
  line-height: 1.5;
}

.submit-btn {
  margin: 32rpx 24rpx;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 44rpx;
  background: #048C47;
  color: #ffffff;
  font-size: 30rpx;
}

.submit-btn.disabled {
  opacity: 0.6;
}
</style>