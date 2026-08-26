<template>
  <view class="add-page">
    <view class="form-card">
      <view class="field">
        <text class="field-label required">商机标题</text>
        <input v-model="form.title" class="field-input" placeholder="请输入商机标题" :maxlength="100" />
      </view>
      <view class="field">
        <text class="field-label">城市</text>
        <input v-model="form.city" class="field-input" placeholder="请输入城市" :maxlength="20" />
      </view>
      <view class="field">
        <text class="field-label">酒店名称</text>
        <input v-model="form.hotelName" class="field-input" placeholder="请输入酒店名称" :maxlength="50" />
      </view>
      <view class="field">
        <text class="field-label">联系人</text>
        <input v-model="form.contactName" class="field-input" placeholder="请输入联系人" :maxlength="20" />
      </view>
      <view class="field">
        <text class="field-label">联系电话</text>
        <input v-model="form.contactPhone" class="field-input" placeholder="请输入联系电话" type="number" :maxlength="20" />
      </view>
      <view class="field">
        <text class="field-label">商机描述</text>
        <textarea
          v-model="form.description"
          class="field-textarea"
          placeholder="请输入商机描述"
          :maxlength="500"
        />
      </view>
    </view>

    <view class="submit-btn" :class="{ disabled: submitting }" @click="handleSubmit">
      {{ submitting ? '提交中...' : '提交录入' }}
    </view>
  </view>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { api } from '@/api/index';

const submitting = ref(false);
const form = reactive({
  title: '',
  city: '',
  hotelName: '',
  description: '',
  contactName: '',
  contactPhone: '',
});

async function handleSubmit() {
  if (!form.title.trim()) {
    uni.showToast({ title: '请填写商机标题', icon: 'none' });
    return;
  }
  if (submitting.value) return;
  submitting.value = true;
  try {
    await api.crmAdd({
      title: form.title.trim(),
      city: form.city.trim(),
      hotelName: form.hotelName.trim(),
      description: form.description.trim(),
      contactName: form.contactName.trim(),
      contactPhone: form.contactPhone.trim(),
    });
    uni.showToast({ title: '录入成功', icon: 'success' });
    setTimeout(() => {
      uni.switchTab({ url: '/pages/crm/index' });
    }, 800);
  } catch (e) {
    uni.showToast({ title: e.message || '录入失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}
</script>

<style lang="scss" scoped>
.add-page {
  min-height: 100vh;
}

.form-card {
  margin: 16rpx 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 8rpx 24rpx;
}

.field {
  display: flex;
  align-items: flex-start;
  padding: 24rpx 0;
  border-bottom: 1px solid #F2F4F5;
}

.field:last-child {
  border-bottom: none;
}

.field-label {
  width: 160rpx;
  font-size: 28rpx;
  color: #1A1A1A;
  flex-shrink: 0;
  padding-top: 4rpx;
}

.field-label.required::after {
  content: ' *';
  color: #E54848;
}

.field-input {
  flex: 1;
  font-size: 28rpx;
  color: #1A1A1A;
}

.field-textarea {
  flex: 1;
  font-size: 28rpx;
  color: #1A1A1A;
  min-height: 120rpx;
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