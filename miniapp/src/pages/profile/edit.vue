<template>
  <view class="edit-page">
    <view class="form-card">
      <view class="field">
        <text class="field-label required">昵称</text>
        <input v-model="form.nickname" class="field-input" placeholder="请输入昵称" :maxlength="30" />
      </view>
      <view class="field">
        <text class="field-label">公司</text>
        <input v-model="form.company" class="field-input" placeholder="公司名称" :maxlength="50" />
      </view>
      <view class="field" @click="showCategory = true">
        <text class="field-label">供应商类型</text>
        <view class="field-select" :class="{ placeholder: !form.category }">
          {{ categoryLabel(form.category) }}
        </view>
      </view>
      <view class="field field--static">
        <text class="field-label">邮箱</text>
        <text class="field-static">{{ user?.email || '未绑定' }}</text>
      </view>
    </view>

    <view class="form-card">
      <view class="field">
        <text class="field-label">个人简介</text>
        <textarea
          v-model="form.bio"
          class="field-textarea"
          placeholder="介绍你的服务与资源（选填）"
          :maxlength="200"
        />
      </view>
      <view class="field">
        <text class="field-label">专业资质</text>
        <textarea
          v-model="form.qualifications"
          class="field-textarea"
          placeholder="资质证书、荣誉称号等（换行分隔）"
          :maxlength="500"
        />
      </view>
      <view class="field">
        <text class="field-label">典型案例</text>
        <textarea
          v-model="form.cases"
          class="field-textarea"
          placeholder="案例名称和简要描述（换行分隔）"
          :maxlength="500"
        />
      </view>
    </view>

    <view class="submit-btn" :class="{ disabled: submitting }" @click="handleSave">
      {{ submitting ? '保存中...' : '保存' }}
    </view>

    <!-- 分类选择器 -->
    <view v-if="showCategory" class="modal-mask" @click.self="showCategory = false">
      <view class="picker-modal">
        <view class="picker-header">
          <text class="picker-cancel" @click="showCategory = false">取消</text>
          <text class="picker-title">选择供应商类型</text>
          <text class="picker-confirm" @click="showCategory = false">确定</text>
        </view>
        <scroll-view scroll-y class="picker-body">
          <view
            v-for="c in SUPPLIER_CATEGORIES"
            :key="c.value"
            class="picker-item"
            :class="{ active: form.category === c.value }"
            @click="form.category = c.value"
          >
            {{ c.label }}
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useUserStore } from '@/store/user';
import { api } from '@/api/index';
import { SUPPLIER_CATEGORIES, categoryLabel } from '@/common/constants';

const userStore = useUserStore();
const user = userStore.user || {};

const submitting = ref(false);
const showCategory = ref(false);
const form = reactive({
  nickname: user.nickname || '',
  company: user.company || '',
  bio: user.bio || '',
  qualifications: user.qualifications || '',
  cases: user.cases || '',
  category: user.category || SUPPLIER_CATEGORIES[0].value,
});

async function handleSave() {
  if (!form.nickname.trim()) {
    uni.showToast({ title: '请填写昵称', icon: 'none' });
    return;
  }
  if (submitting.value) return;
  submitting.value = true;
  try {
    await api.updateMe({
      nickname: form.nickname.trim(),
      company: form.company.trim(),
      bio: form.bio.trim(),
      qualifications: form.qualifications.trim(),
      cases: form.cases.trim(),
      category: form.category,
    });
    await userStore.fetchMe();
    uni.showToast({ title: '保存成功', icon: 'none' });
    setTimeout(() => {
      uni.navigateBack();
    }, 800);
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}
</script>

<style lang="scss" scoped>
.edit-page {
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

.field--static {
  align-items: flex-start;
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

.field-select {
  flex: 1;
  font-size: 28rpx;
  color: #1A1A1A;
}

.field-select.placeholder {
  color: #B0B0B0;
}

.field-static {
  flex: 1;
  font-size: 28rpx;
  color: #7A7A7A;
  text-align: right;
}

.field-textarea {
  flex: 1;
  font-size: 28rpx;
  color: #1A1A1A;
  min-height: 100rpx;
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

/* 分类选择弹窗 */
.modal-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: flex-end;
}

.picker-modal {
  width: 100%;
  background: #ffffff;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 60vh;
  padding-bottom: env(safe-area-inset-bottom);
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1px solid #F2F4F5;
}

.picker-cancel {
  color: #7A7A7A;
  font-size: 28rpx;
}

.picker-confirm {
  color: #048C47;
  font-size: 28rpx;
}

.picker-body {
  max-height: 45vh;
}

.picker-item {
  padding: 28rpx 32rpx;
  font-size: 28rpx;
  color: #1A1A1A;
  border-bottom: 1px solid #F8FAF9;
}

.picker-item.active {
  color: #048C47;
  font-weight: 600;
}
</style>