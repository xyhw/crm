<template>
  <view class="admin-list-page">
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else>
      <view v-for="item in list" :key="item.id" class="card-item" @click="openEdit(item)">
        <view class="card-item__head">
          <text class="card-item__title">{{ item.name || item.level_key }}</text>
          <text class="card-item__sub">购买折扣 {{ pct(item.purchase_discount) }}</text>
        </view>
        <view class="card-item__info">
          <text>佣金加成 +{{ pct(item.commission_bonus) }}</text>
          <text>标记权重 {{ item.mark_weight }}</text>
        </view>
        <view class="card-item__info">
          <text>购买率 {{ item.purchase_rate_threshold }}%</text>
          <text>失效率 {{ item.invalid_rate_threshold }}%</text>
        </view>
        <view class="card-item__info">
          <text>有用率 {{ item.helpful_rate_threshold }}%</text>
          <text>活跃度 {{ item.activity_threshold }}</text>
        </view>
        <view class="card-item__info">
          <text>无效标记权重 {{ item.mark_weight }}</text>
          <text>免审 {{ item.free_audit ? '是' : '否' }}</text>
        </view>
      </view>
    </view>

    <view v-if="editItem" class="modal-mask" @click="editItem = null">
      <view class="modal-box" @click.stop>
        <view class="modal-title">{{ editItem.name || editItem.level_key }}</view>
        <view class="form-row">
          <text class="form-label">购买折扣(0.9=9折)</text>
          <input v-model="editForm.purchase_discount" class="form-input" type="digit" placeholder="0.85" />
        </view>
        <view class="form-row">
          <text class="form-label">分佣加成(0.1=10%)</text>
          <input v-model="editForm.commission_bonus" class="form-input" type="digit" placeholder="0.1" />
        </view>
        <view class="form-row">
          <text class="form-label">购买率阈值(%)</text>
          <input v-model="editForm.purchase_rate_threshold" class="form-input" type="digit" placeholder="30" />
        </view>
        <view class="form-row">
          <text class="form-label">失效率阈值(%)</text>
          <input v-model="editForm.invalid_rate_threshold" class="form-input" type="digit" placeholder="10" />
        </view>
        <view class="form-row">
          <text class="form-label">有用率阈值(%)</text>
          <input v-model="editForm.helpful_rate_threshold" class="form-input" type="digit" placeholder="80" />
        </view>
        <view class="form-row">
          <text class="form-label">活跃度阈值</text>
          <input v-model="editForm.activity_threshold" class="form-input" type="digit" placeholder="0" />
        </view>
        <view class="form-row">
          <text class="form-label">无效标记权重</text>
          <input v-model="editForm.mark_weight" class="form-input" type="digit" placeholder="0" />
        </view>
        <view class="form-row">
          <text class="form-label">进度分享免审</text>
          <switch
            :checked="!!editForm.free_audit"
            color="#048C47"
            @change="editForm.free_audit = $event.detail.value ? 1 : 0"
          />
        </view>
        <view class="modal-btn" @click="submitEdit">保存</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/admin/adminApi';

const list = ref([]);
const loading = ref(false);
const editItem = ref(null);
const editForm = ref({});

function pct(v) {
  const n = Number(v);
  return Number.isNaN(n) ? '0%' : `${Math.round((n || 0) * 100)}%`;
}

async function fetchList() {
  loading.value = true;
  try {
    list.value = await adminApi.getLevels();
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  } finally {
    loading.value = false;
  }
}

onShow(() => fetchList());

function openEdit(item) {
  editItem.value = item;
  editForm.value = {
    purchase_discount: String(item.purchase_discount ?? ''),
    commission_bonus: String(item.commission_bonus ?? ''),
    purchase_rate_threshold: String(item.purchase_rate_threshold ?? ''),
    invalid_rate_threshold: String(item.invalid_rate_threshold ?? ''),
    helpful_rate_threshold: String(item.helpful_rate_threshold ?? ''),
    activity_threshold: String(item.activity_threshold ?? ''),
    mark_weight: String(item.mark_weight ?? ''),
    free_audit: item.free_audit ? 1 : 0,
  };
}
async function submitEdit() {
  const num = (v, d = 0) => {
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
  };
  const checks = [
    ['购买折扣', num(editForm.value.purchase_discount), 0, 1],
    ['分佣加成', num(editForm.value.commission_bonus), 0, 1],
    ['购买率阈值', num(editForm.value.purchase_rate_threshold), 0, 100],
    ['失效率阈值', num(editForm.value.invalid_rate_threshold), 0, 100],
    ['有用率阈值', num(editForm.value.helpful_rate_threshold), 0, 100],
    ['活跃度阈值', num(editForm.value.activity_threshold), 0, null],
    ['无效标记权重', num(editForm.value.mark_weight), 1, 3],
  ];
  for (const [label, v, min, max] of checks) {
    if (Number.isNaN(v)) {
      uni.showToast({ title: `${label}格式不正确`, icon: 'none' });
      return;
    }
    if (min !== null && v < min) {
      uni.showToast({ title: `${label}不能小于${min}`, icon: 'none' });
      return;
    }
    if (max !== null && v > max) {
      uni.showToast({ title: `${label}不能大于${max}`, icon: 'none' });
      return;
    }
  }
  const body = {
    purchaseDiscount: num(editForm.value.purchase_discount),
    commissionBonus: num(editForm.value.commission_bonus),
    purchaseRateThreshold: num(editForm.value.purchase_rate_threshold),
    invalidRateThreshold: num(editForm.value.invalid_rate_threshold),
    helpfulRateThreshold: num(editForm.value.helpful_rate_threshold),
    activityThreshold: num(editForm.value.activity_threshold),
    markWeight: num(editForm.value.mark_weight),
    freeAudit: editForm.value.free_audit ? 1 : 0,
  };
  try {
    await adminApi.updateLevel(editItem.value.id, body);
    uni.showToast({ title: '保存成功', icon: 'success' });
    editItem.value = null;
    fetchList();
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  }
}
</script>

<style lang="scss" scoped>
.admin-list-page { min-height: 100vh; background: #F2F4F5; padding: 16rpx 24rpx; }
.card-item { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.card-item__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.card-item__title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; }
.card-item__sub { font-size: 24rpx; color: #048C47; }
.card-item__info { display: flex; justify-content: space-between; font-size: 24rpx; color: #7A7A7A; margin-bottom: 8rpx; }
.modal-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 999; display: flex; align-items: flex-end; }
.modal-box { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom)); max-height: 80vh; overflow-y: auto; }
.modal-title { font-size: 32rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 24rpx; text-align: center; }
.form-row { display: flex; align-items: center; padding: 12rpx 0; }
.form-label { width: 220rpx; font-size: 26rpx; color: #7A7A7A; flex-shrink: 0; }
.form-input { flex: 1; height: 72rpx; background: #F7F8F9; border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; }
.modal-btn { margin-top: 32rpx; height: 80rpx; line-height: 80rpx; text-align: center; background: #048C47; color: #fff; border-radius: 40rpx; font-size: 28rpx; }
</style>