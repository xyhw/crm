<template>
  <view class="import-page">
    <view class="tip-card">
      <text class="tip-title">导入说明</text>
      <text class="tip-text">支持 CSV 格式（标题,分类ID,城市,酒店名称,阶段,价格,公开描述,详细描述,联系人,联系电话），标题为必填</text>
    </view>

    <view class="upload-btn" :class="{ disabled: uploading }" @click="chooseFile">
      {{ uploading ? '导入中...' : '选择 CSV 文件' }}
    </view>

    <view v-if="lastResult" class="result-card">
      <view class="result-line">成功：{{ lastResult.successCount }} 条 | 失败：{{ lastResult.errorCount }} 条</view>
      <view v-for="(err, i) in lastResult.errors" :key="i" class="result-err">{{ err }}</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { adminApi } from '@/admin/adminApi';

const lastResult = ref(null);
const uploading = ref(false);

function chooseFile() {
  if (uploading.value) return;
  uni.chooseFile({
    count: 1,
    extension: ['.csv'],
    success: (res) => {
      const filePath = res.tempFiles[0].path;
      handleUpload(filePath);
    },
  });
}

async function handleUpload(filePath) {
  uploading.value = true;
  try {
    const res = await adminApi.importOpportunities(filePath);
    lastResult.value = res;
    uni.showToast({
      title: `成功 ${res.successCount || 0} 条，失败 ${res.errorCount || 0} 条`,
      icon: 'none',
    });
  } catch (e) {
    lastResult.value = { successCount: 0, errorCount: 1, errors: [e.message] };
    uni.showToast({ title: e.message, icon: 'none' });
  } finally {
    uploading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.import-page {
  min-height: 100vh;
  background: #F2F4F5;
  padding: 24rpx;
}
.tip-card {
  background: #EAF4FF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 32rpx;
  display: flex;
  flex-direction: column;
}
.tip-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1B7FE0;
  margin-bottom: 12rpx;
}
.tip-text {
  font-size: 24rpx;
  color: #555;
  line-height: 1.6;
}
.upload-btn {
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  background: #048C47;
  color: #ffffff;
  border-radius: 12rpx;
  font-size: 30rpx;
}
.upload-btn.disabled {
  opacity: 0.6;
}
.result-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-top: 32rpx;
}
.result-line {
  font-size: 28rpx;
  color: #1A1A1A;
  font-weight: 600;
}
.result-err {
  font-size: 24rpx;
  color: #E54848;
  margin-top: 8rpx;
}
</style>