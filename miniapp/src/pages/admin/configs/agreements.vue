<template>
  <view class="agreement-page">
    <view v-for="row in rows" :key="row.key" class="card-item">
      <view class="card-item__head">
        <text class="card-item__title">{{ row.label }}</text>
        <view class="head-actions">
          <text v-if="row.configured" class="badge">已配置</text>
          <text v-else class="badge none">未配置</text>
          <view class="edit-btn" @click="openEdit(row)">编辑</view>
        </view>
      </view>
      <view class="card-item__info">
        <text>标题：{{ row.title }}</text>
        <text>{{ row.sectionCount }} 个章节</text>
      </view>
    </view>

    <!-- 编辑弹层 -->
    <view v-if="editing" class="modal-mask" @click="closeEdit">
      <view class="modal-box" @click.stop>
        <view class="modal-title">编辑{{ editing.label }}</view>
        <view class="form-row">
          <text class="form-label">标题</text>
          <input v-model="editForm.title" class="form-input" placeholder="协议标题" />
        </view>

        <view v-for="(sec, i) in editForm.sections" :key="i" class="section-edit">
          <view class="section-edit__head">
            <text class="section-edit__label">章节 {{ i + 1 }}</text>
            <text class="remove-btn" @click="removeSection(i)">删除</text>
          </view>
          <input v-model="sec.h" class="form-input" placeholder="章节标题（如：一、服务内容）" />
          <textarea
            v-model="sec.p"
            class="form-textarea"
            placeholder="章节正文"
            auto-height
          />
        </view>

        <view class="add-btn" @click="addSection">+ 添加章节</view>
        <view class="modal-btn" @click="save">保存</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { adminApi } from '@/admin/adminApi';

const AGREEMENT_TYPES = [
  { key: 'agreement', label: '用户协议' },
  { key: 'privacy', label: '隐私政策' },
  { key: 'summary', label: '平台须知' },
  { key: 'disclaimer', label: '免责声明' },
  { key: 'service', label: '服务条款' },
  { key: 'refund', label: '退款说明' },
  { key: 'complaint', label: '投诉渠道' },
];

const rows = ref([]);
const editing = ref(null);
const editForm = ref({ title: '', sections: [] });

function parseAgreement(raw) {
  if (typeof raw !== 'string') return raw;
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
  } catch (e) {
    return raw;
  }
  return raw;
}

async function fetchData() {
  try {
    const res = await adminApi.getConfigs();
    rows.value = AGREEMENT_TYPES.map(({ key, label }) => {
      const raw = res[`agreement_${key}`];
      const content = parseAgreement(raw);
      const sections = Array.isArray(content?.sections)
        ? content.sections
        : typeof content === 'object' && content !== null
          ? []
          : [];
      return {
        key,
        label,
        title: content?.title || label,
        sectionCount: sections.length,
        configured: !!raw,
      };
    });
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  }
}

onShow(() => fetchData());

async function openEdit(row) {
  try {
    const res = await adminApi.getConfigs();
    const raw = res[`agreement_${row.key}`];
    let content = { title: row.label, sections: [] };
    const parsed = parseAgreement(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      content = {
        title: parsed.title || row.label,
        sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      };
    }
    editing.value = row;
    editForm.value = {
      title: content.title,
      sections: content.sections.map((s) => ({ h: s.h || '', p: s.p || '' })),
    };
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  }
}

function closeEdit() {
  editing.value = null;
}
function addSection() {
  editForm.value.sections.push({ h: '', p: '' });
}
function removeSection(i) {
  editForm.value.sections.splice(i, 1);
}

async function save() {
  try {
    const payload = {
      title: editForm.value.title,
      sections: editForm.value.sections.map((s) => ({ h: s.h, p: s.p })),
    };
    await adminApi.updateConfig({ [`agreement_${editing.value.key}`]: payload });
    uni.showToast({ title: '协议已保存', icon: 'success' });
    editing.value = null;
    fetchData();
  } catch (e) {
    uni.showToast({ title: e.message, icon: 'none' });
  }
}
</script>

<style lang="scss" scoped>
.agreement-page { min-height: 100vh; background: #F2F4F5; padding: 16rpx 24rpx; }
.card-item { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.card-item__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.card-item__title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; }
.head-actions { display: flex; align-items: center; gap: 16rpx; }
.badge { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; color: #048C47; background: #E4F7EC; }
.badge.none { color: #B0B0B0; background: #F2F4F5; }
.edit-btn { font-size: 24rpx; color: #048C47; padding: 6rpx 20rpx; border: 1px solid #048C47; border-radius: 28rpx; }
.card-item__info { display: flex; justify-content: space-between; font-size: 24rpx; color: #7A7A7A; }
.modal-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 999; display: flex; align-items: flex-end; }
.modal-box { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom)); max-height: 85vh; overflow-y: auto; }
.modal-title { font-size: 32rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 24rpx; text-align: center; }
.form-row { display: flex; align-items: center; padding: 12rpx 0; }
.form-label { width: 140rpx; font-size: 26rpx; color: #7A7A7A; flex-shrink: 0; }
.form-input { flex: 1; height: 72rpx; background: #F7F8F9; border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; }
.section-edit { background: #F7F8F9; border-radius: 12rpx; padding: 20rpx; margin-top: 16rpx; }
.section-edit__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.section-edit__label { font-size: 26rpx; font-weight: 600; color: #333; }
.remove-btn { font-size: 24rpx; color: #E54848; }
.section-edit .form-input { background: #fff; margin-bottom: 12rpx; }
.form-textarea { width: 100%; min-height: 120rpx; background: #fff; border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 26rpx; box-sizing: border-box; }
.add-btn { margin-top: 24rpx; height: 72rpx; line-height: 72rpx; text-align: center; border: 1px dashed #048C47; color: #048C47; border-radius: 12rpx; font-size: 26rpx; }
.modal-btn { margin-top: 32rpx; height: 80rpx; line-height: 80rpx; text-align: center; background: #048C47; color: #fff; border-radius: 40rpx; font-size: 28rpx; }
</style>