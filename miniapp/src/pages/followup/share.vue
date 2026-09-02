<template>
  <view class="share-page">
    <view class="form-card">
      <view v-if="fromFollowUp" class="from-follow-tip">已带入跟进记录的状态和内容，确认或修改后同步</view>
      <view class="dialog-label">当前进展阶段</view>
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
        placeholder="简要描述最新进展，例如：已上门洽谈，房东意向较强（匿名展示）"
        :maxlength="200"
      />

      <view class="dialog-tip">同步后将以匿名形式展示在该商机的进展中，供同一条商机的其他购买者参考，请勿填写联系方式等隐私信息。</view>
      <view class="dialog-reward">同步通过审核 +2 积分，被点赞再 +1 积分</view>
    </view>

    <view class="submit-btn" :class="{ disabled: submitting }" @click="handleShare">
      {{ submitting ? '提交中...' : '同步进展' }}
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
const followUpId = ref('');
const fromFollowUp = ref(false);
const submitting = ref(false);
const form = reactive({
  status: 'call_no_answer',
  summary: '',
});

onLoad((options) => {
  opportunityId.value = options.opportunityId || '';
  crmId.value = options.crmId || '';
  followUpId.value = options.followUpId || '';
  if (options.status && FOLLOW_UP_STATUS.some((s) => s.value === options.status)) {
    form.status = options.status;
  }
  if (options.summary) {
    form.summary = decodeURIComponent(options.summary);
    fromFollowUp.value = true;
  }
});

async function handleShare() {
  if (!form.summary.trim()) {
    uni.showToast({ title: '请简要描述最新进展', icon: 'none' });
    return;
  }
  if (submitting.value) return;
  submitting.value = true;
  try {
    await api.shareFollowUp({
      followUpId: followUpId.value ? Number(followUpId.value) : undefined,
      opportunityId: Number(opportunityId.value),
      status: form.status,
      summary: form.summary.trim(),
    });
    uni.showToast({ title: '已同步', icon: 'none' });
    setTimeout(() => {
      if (crmId.value) {
        uni.redirectTo({ url: `/pages/crm/detail?id=${crmId.value}` });
      } else {
        uni.navigateBack();
      }
    }, 800);
  } catch (e) {
    uni.showToast({ title: e.message || '同步失败', icon: 'none' });
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

.from-follow-tip {
  font-size: 24rpx;
  color: #048C47;
  background: rgba(4, 140, 71, 0.08);
  border-radius: 8rpx;
  padding: 12rpx 16rpx;
  margin-bottom: 16rpx;
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