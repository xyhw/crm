<template>
  <view class="admin-list-page">
    <view class="filter-bar">
      <input
        v-model="keywordInput"
        class="filter-input"
        placeholder="搜索标题/酒店/城市"
        confirm-type="search"
        @confirm="applyFilter"
      />
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

    <view v-if="loading && list.length === 0" class="empty">加载中...</view>
    <view v-else-if="list.length === 0" class="empty">暂无数据</view>
    <view v-else>
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
          <view v-if="item.status === 'active'" class="act-btn danger" @click.stop="toggleStatus(item)">下架</view>
          <view v-else-if="item.status === 'inactive'" class="act-btn" @click.stop="toggleStatus(item)">上架</view>
        </view>
      </view>

      <!-- 固定分页 -->
      <view v-if="pageCount > 1" class="pager">
        <view class="pager-btn" :class="{ disabled: page <= 1 }" @click="goPage(page - 1)">上一页</view>
        <text class="pager-info">{{ page }} / {{ pageCount }}</text>
        <view class="pager-btn" :class="{ disabled: page >= pageCount }" @click="goPage(page + 1)">下一页</view>
      </view>
      <view class="pager-total">共 {{ total }} 条</view>
    </view>

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
        <view class="modal-row"><text class="modal-label">状态</text><text>{{ opportunityStatusLabel(detail.status) }}</text></view>
        <view class="modal-row"><text class="modal-label">阶段</text><text>{{ detail.stage || '-' }}</text></view>
        <view class="modal-row"><text class="modal-label">公开描述</text><text>{{ detail.description_public || '-' }}</text></view>
        <view class="modal-row"><text class="modal-label">完整描述</text><text>{{ detail.description_full || '-' }}</text></view>
        <view class="modal-row"><text class="modal-label">联系人</text><text>{{ detail.contact_name || '-' }} {{ detail.contact_phone || '-' }}</text></view>
        <view class="modal-row"><text class="modal-label">发布时间</text><text>{{ formatDate(detail.created_at) }}</text></view>
        <view class="modal-btn" @click="detail = null">关闭</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/admin/adminApi';
import { formatDate, opportunityStatusLabel } from '@/common/constants';

const list = ref([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = 10;
const keywordInput = ref('');
const status = ref('');
const detail = ref(null);

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

async function toggleStatus(item) {
  const next = item.status === 'active' ? 'inactive' : 'active';
  const label = next === 'inactive' ? '下架' : '上架';
  uni.showModal({
    title: '提示',
    content: `确认${label}该商机？`,
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await adminApi.updateOpportunity(item.id, { status: next });
        uni.showToast({ title: `${label}成功`, icon: 'success' });
        fetchList(page.value);
      } catch (e) {
        uni.showToast({ title: e.message, icon: 'none' });
      }
    },
  });
}
</script>

<style lang="scss" scoped>
.admin-list-page {
  min-height: 100vh;
  background: #F2F4F5;
  padding: 16rpx 24rpx;
}
.filter-bar {
  margin-bottom: 16rpx;
}
.filter-input {
  height: 72rpx;
  background: #ffffff;
  border-radius: 36rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
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
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 0;
}
.pager-btn {
  padding: 8rpx 28rpx;
  border: 1px solid #DDDDDD;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #333;
  background: #fff;
}
.pager-btn.disabled {
  color: #C0C0C0;
  border-color: #EEEEEE;
  background: #F7F8F9;
}
.pager-info {
  margin: 0 24rpx;
  font-size: 26rpx;
  color: #333;
}
.pager-total {
  text-align: center;
  font-size: 24rpx;
  color: #B0B0B0;
  padding-bottom: 16rpx;
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