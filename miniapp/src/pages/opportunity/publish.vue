<template>
  <view class="publish-page">
    <!-- 步骤条 -->
    <view class="steps">
      <view class="step-item" :class="{ active: step === 1 }">
        <view class="step-dot">{{ step === 1 ? '1' : '✓' }}</view>
        <text class="step-label">基本信息</text>
      </view>
      <view class="step-line" :class="{ done: step === 2 }" />
      <view class="step-item" :class="{ active: step === 2 }">
        <view class="step-dot">{{ step === 2 ? '2' : '✓' }}</view>
        <text class="step-label">补充详情</text>
      </view>
    </view>

    <!-- 基本信息 -->
    <view v-if="step === 1" class="form-card">
      <view class="field">
        <text class="field-label required">项目名称</text>
        <input v-model="form.title" class="field-input" placeholder="如：某酒店弱电总包采购" :maxlength="100" />
      </view>
      <view class="field" @click="showCategory = true">
        <text class="field-label required">需求</text>
        <view class="field-select" :class="{ placeholder: !form.categoryName }">
          {{ form.categoryName || '请选择' }}
        </view>
      </view>
      <view class="field">
        <text class="field-label required">品牌</text>
        <input v-model="form.brand" class="field-input" placeholder="如：某国际大酒店" :maxlength="50" />
      </view>
      <view class="field">
        <text class="field-label required">城市</text>
        <input v-model="form.city" class="field-input" placeholder="如：上海" :maxlength="20" />
      </view>
      <view class="field">
        <text class="field-label">具体地址</text>
        <input v-model="form.address" class="field-input" placeholder="如：上海市浦东新区世纪大道100号" :maxlength="100" />
      </view>
      <view class="field">
        <text class="field-label required">联系人</text>
        <input v-model="form.contactName" class="field-input" placeholder="如：王经理" :maxlength="20" />
      </view>
      <view class="field">
        <text class="field-label required">联系电话</text>
        <input v-model="form.contactPhone" class="field-input" placeholder="如：13912345678" type="number" :maxlength="20" />
      </view>
      <view class="field">
        <text class="field-label">微信号</text>
        <input v-model="form.wechat" class="field-input" placeholder="如：wang123" :maxlength="50" />
      </view>
      <view class="field">
        <text class="field-label required">积分定价</text>
        <input v-model="form.price" class="field-input" placeholder="建议10-200积分" type="digit" :maxlength="10" />
      </view>
    </view>

    <!-- 补充详情 -->
    <template v-else>
      <view class="form-card">
        <view class="field">
          <text class="field-label">项目现状</text>
          <textarea
            v-model="form.stage"
            class="field-textarea"
            placeholder="如：已完成设计，正在招投标"
            :maxlength="200"
          />
        </view>
        <view class="field">
          <text class="field-label">项目概要</text>
          <textarea
            v-model="form.descriptionFull"
            class="field-textarea"
            placeholder="简要描述项目背景、规模与预期需求"
            :maxlength="500"
          />
        </view>
      </view>

      <!-- 标签 -->
      <view class="section-card">
        <view class="section-title">标签（最多5个）</view>
        <view v-if="form.tags.length" class="tag-list">
          <view v-for="tag in form.tags" :key="tag" class="tag-item" @click="removeTag(tag)">
            {{ tag }}
            <text class="tag-close">×</text>
          </view>
        </view>
        <view v-if="form.tags.length < 5" class="tag-input-row">
          <input v-model="tagInput" class="tag-input" placeholder="输入标签后点添加" :maxlength="10" @confirm="addTag" />
          <text class="tag-add-btn" @click="addTag">添加</text>
        </view>
      </view>

      <!-- 图纸附件 -->
      <view class="section-card">
        <view class="section-title">项目图纸（最多9个）</view>
        <view class="uploader-grid">
          <view v-for="(file, idx) in form.files" :key="idx" class="uploader-item">
            <image :src="absUrl(file.url)" class="uploader-preview" mode="aspectFill" @click="previewFile(idx)" />
            <view class="uploader-remove" @click="removeFile(idx)">×</view>
          </view>
          <view v-if="form.files.length < 9" class="uploader-add" :class="{ uploading }" @click="chooseFiles">
            <text class="add-symbol">{{ uploading ? '...' : '+' }}</text>
            <text class="add-text">{{ uploading ? '上传中' : '上传' }}</text>
          </view>
        </view>
      </view>
    </template>

    <!-- 操作按钮 -->
    <view class="actions">
      <template v-if="step === 1">
        <view class="btn btn--primary" @click="goNext">下一步</view>
      </template>
      <template v-else>
        <view class="btn btn--ghost" @click="step = 1">上一步</view>
        <view class="btn btn--primary" :class="{ disabled: submitting }" @click="handlePublish">
          {{ submitting ? '发布中...' : '发布商机' }}
        </view>
      </template>
    </view>

    <!-- 分类选择器 -->
    <view v-if="showCategory" class="modal-mask" @click.self="showCategory = false">
      <view class="picker-modal">
        <view class="picker-header">
          <text class="picker-cancel" @click="showCategory = false">取消</text>
          <text class="picker-title">选择需求分类</text>
          <text class="picker-confirm" @click="confirmCategory">确定</text>
        </view>
        <scroll-view scroll-y class="picker-body">
          <view
            v-for="c in SUPPLIER_CATEGORIES"
            :key="c.value"
            class="picker-item"
            :class="{ active: form.categoryId === c.value }"
            @click="form.categoryId = c.value; form.categoryName = c.label"
          >
            {{ c.label }}
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 相似商机提示 -->
    <view v-if="similarList && similarList.length" class="modal-mask">
      <view class="dialog-modal">
        <view class="dialog-title">发现相似商机</view>
        <view class="dialog-desc">以下商机与您发布的商机相似：</view>
        <view v-for="s in similarList" :key="s.id" class="dialog-item">{{ s.title }}</view>
        <view class="btn btn--primary" @click="similarList = null">我知道了</view>
      </view>
    </view>

    <view class="bottom-space" />
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/user';
import { api } from '@/api/index';
import { getToken } from '@/common/storage';
import { API_BASE, UPLOAD_BASE } from '@/common/config';
import { SUPPLIER_CATEGORIES } from '@/common/constants';

const userStore = useUserStore();
const MAX_FILES = 9;
const MAX_SIZE = 5 * 1024 * 1024;

const step = ref(1);
const showCategory = ref(false);
const tagInput = ref('');
const submitting = ref(false);
const uploading = ref(false);
const similarList = ref(null);
const editId = ref('');

const defaultCategory = Number(userStore.user?.category) || null;
const form = reactive({
  title: '',
  categoryId: defaultCategory,
  categoryName: defaultCategory ? SUPPLIER_CATEGORIES.find((c) => c.value === defaultCategory)?.label || '' : '',
  brand: '',
  city: '',
  address: '',
  contactName: '',
  contactPhone: '',
  wechat: '',
  price: '',
  stage: '',
  descriptionFull: '',
  tags: [],
  files: [],
});

onLoad((options) => {
  if (options.edit) {
    editId.value = options.edit;
    api.opportunity(options.edit).then((detail) => {
      let parsedFiles = [];
      try {
        const att = detail.attachments ? JSON.parse(detail.attachments) : [];
        parsedFiles = Array.isArray(att) ? att.map((url) => ({ url })) : [];
      } catch {}
      form.title = detail.title || '';
      form.categoryId = detail.categoryId || detail.category_id || null;
      form.categoryName = detail.categoryId || detail.category_id ? SUPPLIER_CATEGORIES.find((c) => c.value === (detail.categoryId || detail.category_id))?.label || '' : '';
      form.brand = detail.brand || '';
      form.city = detail.city || '';
      form.address = detail.address || '';
      form.contactName = detail.contactName || detail.contact_name || '';
      form.contactPhone = detail.contactPhone || detail.contact_phone || '';
      form.wechat = detail.wechat || '';
      form.price = detail.price || '';
      form.stage = detail.stage || '';
      form.descriptionFull = detail.descriptionFull || detail.description_full || '';
      form.files = parsedFiles;
    }).catch((e) => uni.showToast({ title: e.message, icon: 'none' }));
  }
});

function validate() {
  if (!form.title.trim()) return '请输入项目名称';
  if (!form.categoryId) return '请选择需求分类';
  if (!form.brand.trim()) return '请输入品牌';
  if (!form.city.trim()) return '请输入城市';
  if (!form.contactName.trim()) return '请输入联系人';
  if (!form.contactPhone.trim()) return '请输入联系电话';
  if (!form.price || Number(form.price) <= 0) return '请设置积分定价';
  return null;
}

function toast(msg) {
  uni.showToast({ title: msg, icon: 'none' });
}

function goNext() {
  const err = validate();
  if (err) return toast(err);
  step.value = 2;
}

function addTag() {
  const tag = tagInput.value.trim();
  if (tag && !form.tags.includes(tag) && form.tags.length < 5) {
    form.tags.push(tag);
    tagInput.value = '';
  }
}

function removeTag(tag) {
  form.tags = form.tags.filter((t) => t !== tag);
}

function confirmCategory() {
  showCategory.value = false;
}

function chooseFiles() {
  if (uploading.value) return;
  uni.chooseImage({
    count: MAX_FILES - form.files.length,
    success: (res) => {
      uploadFiles(res.tempFilePaths);
    },
  });
}

async function uploadFiles(paths) {
  if (!paths.length) return;
  if (form.files.length + paths.length > MAX_FILES) {
    return toast(`最多上传 ${MAX_FILES} 个文件`);
  }
  uploading.value = true;
  const token = getToken();
  try {
    for (const filePath of paths) {
      await new Promise((resolve) => {
        uni.uploadFile({
          url: API_BASE + '/upload',
          filePath,
          name: 'file',
          header: token ? { Authorization: `Bearer ${token}` } : {},
          success: (uploadRes) => {
            try {
              const json = JSON.parse(uploadRes.data);
              if (json.code === 0) {
                form.files.push(json.data);
              } else {
                toast(json.message || '上传失败');
              }
            } catch (e) {
              toast('上传失败');
            }
            resolve();
          },
          fail: () => {
            toast('上传失败');
            resolve();
          },
        });
      });
    }
  } finally {
    uploading.value = false;
  }
}

function removeFile(idx) {
  form.files.splice(idx, 1);
}

function absUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return UPLOAD_BASE + url;
}

function previewFile(idx) {
  const urls = form.files.map((f) => absUrl(f.url));
  uni.previewImage({ urls, current: urls[idx] });
}

async function handlePublish() {
  const err = validate();
  if (err) return toast(err);
  if (submitting.value) return;

  submitting.value = true;
  try {
    const payload = {
      title: form.title.trim(),
      categoryId: form.categoryId,
      brand: form.brand.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      contactName: form.contactName.trim(),
      contactPhone: form.contactPhone.trim(),
      wechat: form.wechat.trim(),
      price: Number(form.price),
      stage: form.stage.trim(),
      descriptionFull: form.descriptionFull.trim(),
      tags: form.tags,
      attachments: form.files.map((f) => f.url),
    };
    if (editId.value) {
      await api.updateOpportunity(editId.value, payload);
      uni.showToast({ title: '已更新', icon: 'success' });
      setTimeout(() => {
        uni.navigateBack();
      }, 500);
    } else {
      const data = await api.createOpportunity({
        title: form.title.trim(),
        categoryId: form.categoryId,
        brand: form.brand.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        contactName: form.contactName.trim(),
        contactPhone: form.contactPhone.trim(),
        wechat: form.wechat.trim(),
        price: Number(form.price),
        stage: form.stage.trim(),
        descriptionFull: form.descriptionFull.trim(),
        tags: form.tags,
        attachments: form.files.map((f) => f.url),
      });

      if (data?.similarOpportunities?.length) {
        similarList.value = data.similarOpportunities;
        toast('存在相似商机，请检查');
      } else {
        uni.showToast({ title: '发布成功', icon: 'success' });
        setTimeout(() => {
          uni.switchTab({ url: '/pages/hall/hall' });
        }, 800);
      }
    }
  } catch (e) {
    toast(e.message || '发布失败');
  } finally {
    submitting.value = false;
  }
}
</script>

<style lang="scss" scoped>
.publish-page {
  min-height: 100vh;
  padding-bottom: 40rpx;
}

/* 步骤条 */
.steps {
  display: flex;
  align-items: center;
  padding: 32rpx 60rpx;
  background: #ffffff;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.step-dot {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #F2F4F5;
  color: #B0B0B0;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-item.active .step-dot {
  background: #048C47;
  color: #ffffff;
}

.step-label {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #B0B0B0;
}

.step-item.active .step-label {
  color: #048C47;
}

.step-line {
  flex: 1;
  height: 4rpx;
  background: #F2F4F5;
  margin: 0 24rpx;
  margin-bottom: 48rpx;
}

.step-line.done {
  background: #048C47;
}

/* 表单 */
.form-card,
.section-card {
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

.field-select.placeholder {
  color: #B0B0B0;
}

.field-select {
  flex: 1;
  font-size: 28rpx;
  color: #1A1A1A;
}

.field-textarea {
  flex: 1;
  font-size: 28rpx;
  color: #1A1A1A;
  min-height: 100rpx;
  line-height: 1.5;
}

/* 标签 */
.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
  padding: 24rpx 0 16rpx;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
}

.tag-item {
  padding: 8rpx 20rpx;
  margin: 0 16rpx 16rpx 0;
  background: #E4F7EC;
  color: #048C47;
  font-size: 24rpx;
  border-radius: 8rpx;
}

.tag-close {
  margin-left: 8rpx;
}

.tag-input-row {
  display: flex;
  align-items: center;
  padding-bottom: 24rpx;
}

.tag-input {
  flex: 1;
  height: 64rpx;
  line-height: 64rpx;
  background: #F2F4F5;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
}

.tag-add-btn {
  margin-left: 16rpx;
  color: #048C47;
  font-size: 26rpx;
}

/* 上传 */
.uploader-grid {
  display: flex;
  flex-wrap: wrap;
  padding-bottom: 24rpx;
}

.uploader-item,
.uploader-add {
  width: 180rpx;
  height: 180rpx;
  margin: 0 16rpx 16rpx 0;
  border-radius: 12rpx;
  position: relative;
  overflow: hidden;
}

.uploader-preview {
  width: 100%;
  height: 100%;
}

.uploader-remove {
  position: absolute;
  top: 0;
  right: 0;
  width: 40rpx;
  height: 40rpx;
  background: rgba(0, 0, 0, 0.5);
  color: #ffffff;
  font-size: 28rpx;
  text-align: center;
  line-height: 36rpx;
  border-radius: 0 12rpx 0 12rpx;
}

.uploader-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #F8FAF9;
  border: 2rpx dashed #D5D9D6;
  color: #B0B0B0;
}

.uploader-add.uploading {
  opacity: 0.6;
}

.add-symbol {
  font-size: 48rpx;
  line-height: 1;
}

.add-text {
  font-size: 22rpx;
  margin-top: 8rpx;
}

/* 按钮 */
.actions {
  display: flex;
  padding: 24rpx;
}

.btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 44rpx;
  font-size: 30rpx;
}

.btn--primary {
  background: #048C47;
  color: #ffffff;
}

.btn--ghost {
  background: #ffffff;
  color: #048C47;
  border: 1px solid #048C47;
  margin-right: 16rpx;
}

.btn.disabled {
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

/* 相似商机弹窗 */
.dialog-modal {
  width: 100%;
  background: #ffffff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 40rpx 32rpx;
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
}

.dialog-title {
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
}

.dialog-desc {
  font-size: 26rpx;
  color: #7A7A7A;
  margin-bottom: 16rpx;
}

.dialog-item {
  padding: 16rpx 20rpx;
  background: #F8FAF9;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #1A1A1A;
  margin-bottom: 12rpx;
}

.dialog-modal .btn {
  margin-top: 24rpx;
}

.bottom-space {
  height: 40rpx;
}
</style>