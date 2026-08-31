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

    <view v-if="editItem" class="modal-mask" @click="tryCloseEdit">
      <view class="modal-box" @click.stop>
        <view class="modal-title">{{ editItem.name || editItem.level_key }}</view>
        <view class="modal-close" @click.stop="tryCloseEdit">×</view>
        <view class="form-row">
          <text class="form-label">购买折扣(0.9=9折)<text class="required-mark">*</text></text>
          <input v-model="editForm.purchase_discount" class="form-input" type="digit" placeholder="0.85" @input="formDirty = true" />
          <text class="form-helper">建议 0.8-0.95，值越小折扣越多</text>
        </view>
        <view class="form-row">
          <text class="form-label">分佣加成(0.1=10%)<text class="required-mark">*</text></text>
          <input v-model="editForm.commission_bonus" class="form-input" type="digit" placeholder="0.1" @input="formDirty = true" />
          <text class="form-helper">在基础分佣比例上额外加成的比例，建议 0-0.2</text>
        </view>
        <view class="form-row">
          <text class="form-label">购买率阈值(%)<text class="required-mark">*</text></text>
          <input v-model="editForm.purchase_rate_threshold" class="form-input" type="digit" placeholder="30" @input="formDirty = true" />
          <text class="form-helper">发布商机被购买的转化率下限，0-100</text>
        </view>
        <view class="form-row">
          <text class="form-label">失效率阈值(%)<text class="required-mark">*</text></text>
          <input v-model="editForm.invalid_rate_threshold" class="form-input" type="digit" placeholder="10" @input="formDirty = true" />
          <text class="form-helper">超过该比例将被判定为无效商机，0-100</text>
        </view>
        <view class="form-row">
          <text class="form-label">有用率阈值(%)<text class="required-mark">*</text></text>
          <input v-model="editForm.helpful_rate_threshold" class="form-input" type="digit" placeholder="80" @input="formDirty = true" />
          <text class="form-helper">用户反馈有用的最低比例，0-100</text>
        </view>
        <view class="form-row">
          <text class="form-label">活跃度阈值<text class="required-mark">*</text></text>
          <input v-model="editForm.activity_threshold" class="form-input" type="digit" placeholder="0" @input="formDirty = true" />
          <text class="form-helper">满足最低发布/互动次数才可晋升至该等级</text>
        </view>
        <view class="form-row">
          <text class="form-label">无效标记权重<text class="required-mark">*</text></text>
          <input v-model="editForm.mark_weight" class="form-input" type="digit" placeholder="0" @input="formDirty = true" />
          <text class="form-helper">每条无效标记的扣分权重，取值 1-3</text>
        </view>
        <view class="form-row">
          <text class="form-label">进度分享免审</text>
          <switch
            :checked="!!editForm.free_audit"
            color="#037539"
            @change="onFreeAuditChange"
          />
          <text class="form-helper">开启后该等级的进度分享可跳过人工审核</text>
        </view>
        <view class="modal-btn" :class="{ disabled: saving }" @click="submitEdit">{{ saving ? '保存中...' : '保存' }}</view>
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
const saving = ref(false);
const formDirty = ref(false);

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
  formDirty.value = false;
}
function onFreeAuditChange(e) {
  editForm.value.free_audit = e.detail.value ? 1 : 0;
  formDirty.value = true;
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
  saving.value = true;
  try {
    await adminApi.updateLevel(editItem.value.id, body);
    uni.showToast({ title: '保存成功', icon: 'success' });
    formDirty.value = false;
    editItem.value = null;
    fetchList();
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
</script>

<style lang="scss" scoped>
.admin-list-page { touch-action: manipulation;
  min-height: 100dvh; background: #F2F4F5; padding: 16rpx 24rpx; }
.card-item { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.card-item__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.card-item__title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; }
.card-item__sub { font-size: 24rpx; color: #037539; }
.card-item__info { display: flex; justify-content: space-between; font-size: 24rpx; color: #555555; margin-bottom: 8rpx; }
.modal-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 999; display: flex; align-items: flex-end; }
.modal-box { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom)); max-height: 80vh; overflow-y: auto; position: relative; }
.modal-title { font-size: 32rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 24rpx; text-align: center; }
.form-row { display: flex; align-items: center; padding: 12rpx 0; }
.form-label { width: 220rpx; font-size: 26rpx; color: #555555; flex-shrink: 0; }
.form-input { flex: 1; height: 72rpx; background: #F7F8F9; border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; }
.form-input:focus { border-color: #037539; background: #fff; }
.modal-btn { margin-top: 32rpx; height: 88rpx; line-height: 88rpx; text-align: center; background: #037539; color: #fff; border-radius: 40rpx; font-size: 28rpx; }
.modal-btn.disabled { opacity: 0.6; }
.required-mark { color: #E54848; margin-left: 4rpx; }
.form-helper { display: block; font-size: 22rpx; color: #888; margin-top: 6rpx; padding-left: 8rpx; }
.modal-mask { animation: mask-fade-in 200ms ease-out; }
.modal-box { animation: sheet-slide-up 250ms cubic-bezier(0.32, 0.72, 0, 1); }
.modal-close { position: absolute; top: 16rpx; right: 24rpx; width: 56rpx; height: 56rpx; line-height: 56rpx; text-align: center; font-size: 36rpx; color: #999; z-index: 1; }
@keyframes mask-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes sheet-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
</style>