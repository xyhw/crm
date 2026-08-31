<template>
  <view class="admin-list-page">
    <view class="filter-bar">
      <SearchBar v-model="keywordInput" placeholder="搜索标题/酒店/城市" @search="onSearch" @clear="onClear" />
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
      empty-title="暂无商机"
      empty-desc="暂无商机记录"
      :skeleton-count="4"
    >
      <view v-for="item in list" :key="item.id" class="card-item" @click="openDetail(item)">
        <view class="card-item__head">
          <text class="card-item__title">{{ item.title }}</text>
          <text class="status-tag" :class="'tone-' + (item.status === 'active' ? 'verified' : item.status === 'invalid' ? 'hot' : 'default')">{{ opportunityStatusLabel(item.status) }}</text>
        </view>
        <view class="card-item__info">
          <text>{{ item.city || '-' }} · {{ item.hotel_name || '-' }}</text>
          <text>{{ item.publisher_name || '-' }}</text>
        </view>
        <view class="card-item__info">
          <text>{{ item.price }}积分 · {{ item.purchase_count || 0 }}人购</text>
          <text>{{ formatDate(item.created_at) }}</text>
        </view>
        <view class="card-item__actions">
          <view v-if="item.status === 'active'" class="act-btn danger" @click.stop="confirmToggle(item)">下架</view>
          <view v-else-if="item.status === 'inactive'" class="act-btn" @click.stop="confirmToggle(item)">上架</view>
        </view>
      </view>
    </StateView>

    <Pagination :page="page" :page-count="pageCount" :total="total" @change="goPage" />

    <!-- 详情弹层 -->
    <view v-if="detail" class="modal-mask" @click="detail = null">
      <view class="modal-box" @click.stop>
        <view class="modal-title">{{ detail.title }}</view>
        <view class="modal-row"><text class="modal-label">城市</text><text>{{ detail.city }}</text></view>
        <view class="modal-row"><text class="modal-label">酒店</text><text>{{ detail.hotel_name }}</text></view>
        <view class="modal-row"><text class="modal-label">分类</text><text>{{ detail.category_name }}</text></view>
        <view class="modal-row"><text class="modal-label">发布者</text><text>{{ detail.publisher_name }}</text></view>
        <view class="modal-row"><text class="modal-label">定价</text><text>{{ detail.price }}积分</text></view>
        <view class="modal-row"><text class="modal-label">销量/浏览</text><text>{{ detail.purchase_count }} / {{ detail.view_count }}</text></view>
        <view class="modal-row"><text class="modal-label">无效标记</text><text>{{ detail.invalid_mark_count || 0 }}次</text></view>
        <view class="modal-row"><text class="modal-label">有效至</text><text>{{ detail.valid_until ? formatDate(detail.valid_until) : '-' }}</text></view>
        <view class="modal-row"><text class="modal-label">状态</text><text>{{ opportunityStatusLabel(detail.status) }}</text></view>
        <view class="modal-row"><text class="modal-label">阶段</text><text>{{ detail.stage || '-' }}</text></view>
        <view class="modal-row"><text class="modal-label">公开描述</text><text>{{ detail.description_public || '-' }}</text></view>
        <view class="modal-row"><text class="modal-label">完整描述</text><text>{{ detail.description_full || '-' }}</text></view>
        <view class="modal-row"><text class="modal-label">联系人</text><text>{{ detail.contact_name || '-' }} {{ detail.contact_phone || '-' }}</text></view>
        <view class="modal-row"><text class="modal-label">发布时间</text><text>{{ formatDate(detail.created_at) }}</text></view>
        <view v-if="detail.invalidMarks && detail.invalidMarks.length > 0" class="mark-section">
          <view class="mark-title">无效标记记录</view>
          <view v-for="m in detail.invalidMarks" :key="m.id" class="mark-item">
            <text class="mark-user">{{ m.user_name || '-' }}</text>
            <text class="mark-reason">{{ m.reason || '-' }}</text>
            <text class="mark-time">{{ formatDate(m.created_at) }}</text>
          </view>
        </view>
        <view class="modal-btn" @click="detail = null">关闭</view>
      </view>
    </view>

    <ConfirmDialog
      v-model:visible="confirmVisible"
      title="操作确认"
      :content="`确认${confirmNext === 'inactive' ? '下架' : '上架'}该商机？`"
      :confirm-text="confirmNext === 'inactive' ? '下架' : '上架'"
      :tone="confirmNext === 'inactive' ? 'danger' : 'primary'"
      @confirm="doToggle"
    />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/admin/adminApi';
import { formatDate, opportunityStatusLabel } from '@/common/constants';
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
const detail = ref(null);
const confirmVisible = ref(false);
const confirmItem = ref(null);
const confirmNext = ref('');

const statusOptions = [
  { label: '全部', value: '' },
  { label: '销售中', value: 'active' },
  { label: '已下架', value: 'inactive' },
  { label: '已失效', value: 'invalid' },
];

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

async function fetchList(p = 1) {
  loading.value = true;
  try {
    const res = await adminApi.getOpportunities({
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

function applyFilter() {
  fetchList(1);
}
function onSearch() {
  fetchList(1);
}
function onClear() {
  fetchList(1);
}
function selectStatus(s) {
  status.value = s;
  fetchList(1);
}
function goPage(p) {
  if (p < 1 || p > pageCount.value || p === page.value) return;
  fetchList(p);
}

async function openDetail(item) {
  try {
    detail.value = await adminApi.getOpportunityDetail(item.id);
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  }
}

function confirmToggle(item) {
  confirmItem.value = item;
  confirmNext.value = item.status === 'active' ? 'inactive' : 'active';
  confirmVisible.value = true;
}
async function doToggle() {
  if (!confirmItem.value) return;
  const next = confirmNext.value;
  const label = next === 'inactive' ? '下架' : '上架';
  try {
    await adminApi.updateOpportunity(confirmItem.value.id, { status: next });
    uni.showToast({ title: `${label}成功`, icon: 'success' });
    confirmItem.value = null;
    confirmNext.value = '';
    fetchList(page.value);
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  }
}
</script>

<style lang="scss" scoped>
.admin-list-page {
  min-height: 100vh;
  background: #F2F4F5;
  padding: 16rpx 24rpx 140rpx;
}
.filter-bar {
  margin-bottom: 16rpx;
}
.filter-tabs {
  display: flex;
  flex-wrap: wrap;
}
.filter-tab {
  padding: 8rpx 24rpx;
  margin-right: 16rpx;
  margin-bottom: 12rpx;
  border-radius: 28rpx;
  font-size: 24rpx;
  color: #7A7A7A;
  background: #ffffff;
}
.filter-tab.active {
  color: #ffffff;
  background: #048C47;
}
.card-item {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.card-item__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.card-item__title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1A1A;
  flex: 1;
  margin-right: 16rpx;
}
.status-tag {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  color: #7A7A7A;
  background: #F2F4F5;
}
.tone-verified {
  color: #048C47;
  background: #E4F7EC;
}
.tone-hot {
  color: #E54848;
  background: #FDECEC;
}
.card-item__info {
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: #7A7A7A;
  margin-bottom: 8rpx;
}
.card-item__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12rpx;
}
.act-btn {
  padding: 8rpx 32rpx;
  border-radius: 32rpx;
  border: 1px solid #048C47;
  color: #048C47;
  font-size: 24rpx;
}
.act-btn.danger {
  border-color: #E54848;
  color: #E54848;
}
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}
.modal-box {
  width: 100%;
  background: #ffffff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
  max-height: 80vh;
  overflow-y: auto;
}
.modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 24rpx;
  text-align: center;
}
.modal-row {
  display: flex;
  padding: 12rpx 0;
  font-size: 26rpx;
  color: #333;
  border-bottom: 1px solid #F5F5F5;
}
.modal-label {
  width: 160rpx;
  color: #7A7A7A;
  flex-shrink: 0;
}
.mark-section {
  margin-top: 16rpx;
  padding: 16rpx;
  background: #F7F8F9;
  border-radius: 12rpx;
}
.mark-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 12rpx;
}
.mark-item {
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: #333;
  padding: 8rpx 0;
  border-bottom: 1px solid #EEEEEE;
}
.mark-item:last-child {
  border-bottom: none;
}
.mark-user {
  width: 160rpx;
  color: #048C47;
  flex-shrink: 0;
}
.mark-reason {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mark-time {
  margin-left: 16rpx;
  color: #B0B0B0;
  flex-shrink: 0;
}
.modal-btn {
  margin-top: 32rpx;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  background: #048C47;
  color: #fff;
  border-radius: 40rpx;
  font-size: 28rpx;
}
</style>
