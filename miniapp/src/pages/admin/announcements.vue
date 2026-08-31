<template>
  <view class="admin-list-page">
    <view class="page-head">
      <text class="page-title">公告管理</text>
      <view class="head-actions">
        <text class="refresh-btn" @click="fetchList(page)">刷新</text>
        <view class="add-btn" @click="openNew">新建公告</view>
      </view>
    </view>

    <view class="filter-bar">
      <SearchBar v-model="keywordInput" placeholder="搜索标题" @search="onSearch" @clear="onClear" />
      <view class="filter-tabs">
        <view
          v-for="s in statusOptions"
          :key="s.value"
          class="filter-tab"
          :class="{ active: status === s.value }"
          @click="selectStatus(s.value)"
        >{{ s.label }}</view>
      </view>
    </view>

    <StateView
      :loading="loading"
      :empty="!loading && list.length === 0"
      empty-title="暂无公告"
      empty-desc="点击右上角「新建公告」添加"
      :skeleton-count="4"
    >
      <view v-for="item in list" :key="item.id" class="card-item">
        <view class="card-item__head">
          <text class="card-item__title">{{ item.title }}</text>
          <text class="status-tag" :class="item.status === 'active' ? 'tone-verified' : 'tone-hot'">{{ item.status === 'active' ? '启用' : '停用' }}</text>
        </view>
        <view class="card-item__info">
          <text>{{ mediaTypeLabel(item.media_type) }}</text>
          <text>排序 {{ item.sort_order }}</text>
        </view>
        <view class="card-item__info">
          <text>{{ item.is_top ? '置顶' : '普通' }}</text>
          <text>{{ formatDate(item.created_at) }}</text>
        </view>
        <view class="card-item__actions">
          <view class="act-btn" @click="openEdit(item)">编辑</view>
          <view class="act-btn" @click="toggleStatus(item)">{{ item.status === 'active' ? '停用' : '启用' }}</view>
          <view class="act-btn danger" @click="confirmRemove(item)">删除</view>
        </view>
      </view>
    </StateView>

    <Pagination :page="page" :page-count="pageCount" :total="total" @change="goPage" />

    <!-- 编辑弹层 -->
    <view v-if="editItem" class="modal-mask" @click="tryCloseEdit">
      <view class="modal-box" @click.stop>
        <view class="modal-title">{{ editItem.id ? '编辑公告' : '新建公告' }}</view>
        <view class="modal-close" @click.stop="tryCloseEdit">×</view>
        <view class="form-row">
          <text class="form-label">标题<text class="required-mark">*</text></text>
          <view class="form-field">
            <input
              v-model="editForm.title"
              class="form-input"
              :class="{ 'form-input--error': errors.title }"
              placeholder="标题"
              @input="formDirty = true"
              @blur="validateField('title')"
            />
            <text v-if="errors.title" class="form-error">{{ errors.title }}</text>
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">内容</text>
          <textarea v-model="editForm.content" class="form-textarea" placeholder="公告内容" auto-height @input="formDirty = true" />
        </view>
        <view class="form-row">
          <text class="form-label">形式</text>
          <picker :range="mediaOptions.map(o => o.label)" @change="onMediaTypeChange">
            <view class="select-value">{{ mediaTypeLabel(editForm.media_type) }}</view>
          </picker>
        </view>
        <view class="form-row">
          <text class="form-label">媒体链接</text>
          <view class="form-field">
            <input v-model="editForm.media_url" class="form-input" placeholder="图片/视频URL" @input="formDirty = true" />
          </view>
        </view>
        <image
          v-if="editForm.media_url && editForm.media_type !== 'video'"
          :src="editForm.media_url"
          class="media-preview"
          mode="aspectFill"
        />
        <view class="form-row">
          <text class="form-label">跳转链接</text>
          <view class="form-field">
            <input v-model="editForm.link_url" class="form-input" placeholder="点击公告跳转的URL" @input="formDirty = true" />
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">生效时间</text>
          <view class="form-field">
            <input v-model="editForm.start_at" class="form-input" placeholder="YYYY-MM-DD HH:mm:ss，可空" @input="formDirty = true" />
            <text class="form-helper">留空表示不限制生效开始时间</text>
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">失效时间</text>
          <view class="form-field">
            <input v-model="editForm.end_at" class="form-input" placeholder="YYYY-MM-DD HH:mm:ss，可空" @input="formDirty = true" />
            <text class="form-helper">留空表示不限制失效时间</text>
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">排序</text>
          <view class="form-field">
            <input v-model="editForm.sort_order" class="form-input" type="number" placeholder="数字越小越靠前" @input="formDirty = true" />
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">置顶</text>
          <switch :checked="editForm.is_top === 1" color="#037539" @change="onTopChange" />
        </view>
        <view class="modal-btn" :class="{ disabled: saving }" @click="save">{{ saving ? '保存中...' : '保存' }}</view>
      </view>
    </view>

    <ConfirmDialog
      v-model:visible="confirmVisible"
      title="删除确认"
      :content="`确认删除公告「${confirmItem?.title}」？`"
      desc="删除后不可恢复"
      confirm-text="删除"
      tone="danger"
      @confirm="doRemove"
    />
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/admin/adminApi';
import { formatDate } from '@/common/constants';
import SearchBar from '@/components/SearchBar.vue';
import Pagination from '@/components/Pagination.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import StateView from '@/components/StateView.vue';

const list = ref([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = 10;
const keywordInput = ref('');
const status = ref('');
const editItem = ref(null);
const editForm = ref({});
const errors = reactive({ title: '' });
const confirmVisible = ref(false);
const confirmItem = ref(null);
const saving = ref(false);
const formDirty = ref(false);

const mediaOptions = [
  { label: '文字', value: 'text' },
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
  { label: '图文混合', value: 'mixed' },
];
const mediaTypeLabel = (v) => {
  const o = mediaOptions.find((x) => x.value === v);
  return o ? o.label : (v || 'text');
};
const statusOptions = [
  { label: '全部', value: '' },
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
];

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

async function fetchList(p = 1) {
  loading.value = true;
  try {
    const res = await adminApi.getAnnouncements({
      page: p,
      pageSize,
      keyword: keywordInput.value || undefined,
      status: status.value || undefined,
    });
    list.value = res.list || [];
    total.value = res.total || 0;
    page.value = p;
  } catch (e) {
    uni.showToast({ title: e.message || '获取失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

onShow(() => fetchList(1));

function onSearch() { fetchList(1); }
function onClear() { fetchList(1); }
function selectStatus(s) { status.value = s; fetchList(1); }
function goPage(p) {
  if (p < 1 || p > pageCount.value || p === page.value) return;
  fetchList(p);
}

function openNew() {
  editItem.value = { id: null };
  editForm.value = { title: '', content: '', media_type: 'text', media_url: '', link_url: '', start_at: '', end_at: '', sort_order: '0', is_top: 0 };
  errors.title = '';
  formDirty.value = false;
}
function openEdit(item) {
  editItem.value = item;
  editForm.value = {
    title: item.title || '',
    content: item.content || '',
    media_type: item.media_type || 'text',
    media_url: item.media_url || '',
    link_url: item.link_url || '',
    start_at: item.start_at || '',
    end_at: item.end_at || '',
    sort_order: String(item.sort_order ?? 0),
    is_top: item.is_top ? 1 : 0,
  };
  errors.title = '';
  formDirty.value = false;
}
function onMediaTypeChange(e) {
  editForm.value.media_type = mediaOptions[e.detail.value].value;
  formDirty.value = true;
}
function onTopChange(e) {
  editForm.value.is_top = e.detail.value ? 1 : 0;
  formDirty.value = true;
}
function validateField(field) {
  if (field === 'title') {
    errors.title = editForm.value.title && editForm.value.title.trim() ? '' : '标题不能为空';
  }
}
async function save() {
  validateField('title');
  if (errors.title) {
    uni.showToast({ title: errors.title, icon: 'none' });
    return;
  }
  const body = {
    title: editForm.value.title,
    content: editForm.value.content,
    media_type: editForm.value.media_type,
    media_url: editForm.value.media_url,
    link_url: editForm.value.link_url,
    start_at: editForm.value.start_at || null,
    end_at: editForm.value.end_at || null,
    sort_order: Number(editForm.value.sort_order) || 0,
    is_top: editForm.value.is_top ? 1 : 0,
  };
  if (!body.title) {
    uni.showToast({ title: '标题不能为空', icon: 'none' });
    return;
  }
  if (!body.content && !body.media_url) {
    uni.showToast({ title: '正文和附件不能同时为空', icon: 'none' });
    return;
  }
  if (body.media_type === 'mixed' && !body.media_url) {
    uni.showToast({ title: '图文混合需填写媒体链接', icon: 'none' });
    return;
  }
  saving.value = true;
  try {
    if (editItem.value.id) {
      await adminApi.updateAnnouncement(editItem.value.id, body);
    } else {
      await adminApi.createAnnouncement(body);
    }
    uni.showToast({ title: '保存成功', icon: 'success' });
    formDirty.value = false;
    editItem.value = null;
    fetchList(page.value);
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  } finally {
    saving.value = false;
  }
}
function tryCloseEdit() {
  if (formDirty.value) {
    uni.showModal({
      title: '提示',
      content: '表单有未保存的修改，确认关闭？',
      success: (res) => {
        if (res.confirm) {
          formDirty.value = false;
          editItem.value = null;
        }
      },
    });
  } else {
    editItem.value = null;
  }
}
async function toggleStatus(item) {
  const next = item.status === 'active' ? 'inactive' : 'active';
  try {
    await adminApi.updateAnnouncement(item.id, { status: next });
    uni.showToast({ title: '状态已更新', icon: 'success' });
    fetchList(page.value);
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  }
}
function confirmRemove(item) {
  confirmItem.value = item;
  confirmVisible.value = true;
}
async function doRemove() {
  if (!confirmItem.value) return;
  try {
    await adminApi.deleteAnnouncement(confirmItem.value.id);
    uni.showToast({ title: '已删除', icon: 'success', duration: 2000 });
    confirmItem.value = null;
    fetchList(page.value);
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  }
}
</script>

<style lang="scss" scoped>
.admin-list-page { touch-action: manipulation;
  min-height: 100dvh; background: #F2F4F5; padding: 16rpx 24rpx 140rpx; }
.page-head { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; }
.page-title { font-size: 32rpx; font-weight: 700; color: #1A1A1A; }
.head-actions { display: flex; align-items: center; gap: 16rpx; }
.refresh-btn { font-size: 24rpx; color: #666; min-height: 88rpx; line-height: 88rpx; padding: 0 20rpx; border: 1px solid #999; border-radius: 28rpx; }
.add-btn { font-size: 24rpx; color: #037539; min-height: 88rpx; line-height: 88rpx; padding: 0 24rpx; border: 1px solid #037539; border-radius: 28rpx; }
.card-item { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.card-item__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.card-item__title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; flex: 1; margin-right: 16rpx; }
.status-tag { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; color: #555555; background: #F2F4F5; }
.tone-verified { color: #037539; background: #E4F7EC; }
.tone-hot { color: #E54848; background: #FDECEC; }
.card-item__info { display: flex; justify-content: space-between; font-size: 24rpx; color: #555555; margin-bottom: 8rpx; }
.card-item__actions { display: flex; justify-content: flex-end; margin-top: 12rpx; gap: 16rpx; }
.act-btn { min-height: 88rpx; line-height: 88rpx; padding: 0 24rpx; border-radius: 32rpx; border: 1px solid #037539; color: #037539; font-size: 24rpx; }
.act-btn.danger { border-color: #E54848; color: #E54848; }
.modal-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 999; display: flex; align-items: flex-end; }
.modal-box { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom)); max-height: 85vh; overflow-y: auto; position: relative; }
.modal-title { font-size: 32rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 24rpx; text-align: center; }
.form-row { display: flex; align-items: flex-start; padding: 12rpx 0; }
.form-label { width: 150rpx; font-size: 26rpx; color: #555555; flex-shrink: 0; line-height: 72rpx; }
.form-field { flex: 1; }
.form-input { width: 100%; height: 72rpx; background: #F7F8F9; border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; box-sizing: border-box; border: 1px solid transparent; }
.form-input:focus { border-color: #037539; background: #fff; }
.form-input--error { border-color: #E54848; background: #FEF2F2; }
.form-error { display: block; font-size: 22rpx; color: #E54848; margin-top: 8rpx; padding-left: 8rpx; }
.form-helper { display: block; font-size: 22rpx; color: #888; margin-top: 6rpx; padding-left: 8rpx; }
.form-textarea { flex: 1; min-height: 120rpx; background: #F7F8F9; border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 26rpx; }
.select-value { height: 72rpx; line-height: 72rpx; background: #F7F8F9; border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; color: #333; flex: 1; }
.media-preview { width: 100%; height: 240rpx; border-radius: 12rpx; margin-top: 12rpx; }
.filter-bar { margin-bottom: 16rpx; }
.filter-tabs { display: flex; flex-wrap: wrap; margin-top: 16rpx; }
.filter-tab { min-height: 72rpx; line-height: 72rpx; padding: 0 24rpx; margin-right: 16rpx; margin-bottom: 12rpx; border-radius: 28rpx; font-size: 24rpx; color: #555555; background: #fff; }
.filter-tab.active { color: #fff; background: #037539; }
.modal-btn { margin-top: 32rpx; height: 88rpx; line-height: 88rpx; text-align: center; background: #037539; color: #fff; border-radius: 40rpx; font-size: 28rpx; }
.modal-btn.disabled { opacity: 0.6; }
.required-mark { color: #E54848; margin-left: 4rpx; }
.modal-mask { animation: mask-fade-in 200ms ease-out; }
.modal-box { animation: sheet-slide-up 250ms cubic-bezier(0.32, 0.72, 0, 1); }
.modal-close { position: absolute; top: 16rpx; right: 24rpx; width: 56rpx; height: 56rpx; line-height: 56rpx; text-align: center; font-size: 36rpx; color: #999; z-index: 1; }
@keyframes mask-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes sheet-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
</style>
