<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">用户管理</h1>
        <p class="page-sub">资料、积分、信用与封禁</p>
      </div>
    </div>
    <div class="filter-bar">
      <input v-model="keyword" class="input filter-search" placeholder="搜索手机号/昵称" @keyup.enter="search" />
      <button class="btn btn-primary" type="button" @click="search">搜索</button>
      <button class="btn btn-ghost" type="button" @click="clearSearch">清空</button>
      <div class="tabs">
        <button
          v-for="s in statusOptions"
          :key="s.value"
          class="tab"
          :class="{ active: extra.status === s.value }"
          type="button"
          @click="setFilter('status', s.value)"
        >{{ s.label }}</button>
      </div>
    </div>
    <StateView :loading="loading" :empty="!loading && list.length === 0" empty-title="暂无用户">
      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>昵称</th>
              <th>手机号</th>
              <th>公司</th>
              <th>积分</th>
              <th>等级</th>
              <th>信用</th>
              <th>状态</th>
              <th>注册时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id">
              <td>{{ item.nickname || item.phone }}</td>
              <td>{{ item.phone }}</td>
              <td>{{ item.company || '-' }}</td>
              <td class="mono" :class="{ neg: Number(item.points_balance ?? 0) < 0 }">{{ Number(item.points_balance ?? 0) }}</td>
              <td>{{ levelName(item.level) }}</td>
              <td class="mono">{{ item.credit_score || 0 }}</td>
              <td><span class="badge" :class="badgeTone(item.status)">{{ item.status === 'active' ? '正常' : '禁用' }}</span></td>
              <td>{{ formatDate(item.created_at) }}</td>
              <td>
                <div class="row-actions">
                  <button class="btn btn-ghost" type="button" @click="openEdit(item)">编辑</button>
                  <button class="btn btn-ghost" type="button" @click="openAdjust(item, 'points')">积分</button>
                  <button class="btn btn-ghost" type="button" @click="openAdjust(item, 'credit')">信用</button>
                  <button class="btn btn-danger-ghost" type="button" @click="askToggle(item)">
                    {{ item.status === 'active' ? '禁用' : '启用' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination :page="page" :page-count="pageCount" :total="total" @change="goPage" />
    </StateView>

    <Modal v-model="editOpen" title="编辑用户" :dirty="formDirty">
      <label class="field">
        <span class="field-label">昵称<span class="required">*</span></span>
        <input v-model="editForm.nickname" class="input" @input="formDirty = true" />
      </label>
      <label class="field">
        <span class="field-label">公司</span>
        <input v-model="editForm.company" class="input" @input="formDirty = true" />
      </label>
      <template #footer>
        <button class="btn btn-primary" type="button" @click="submitEdit">保存</button>
      </template>
    </Modal>

    <Modal v-model="adjustOpen" :title="adjustType === 'points' ? '调整积分' : '调整信用分'" :dirty="formDirty">
      <p class="field-help">{{ adjustUser?.nickname || adjustUser?.phone }}</p>
      <label class="field">
        <span class="field-label">调整数值<span class="required">*</span></span>
        <input v-model="adjustForm.delta" class="input" type="number" placeholder="正数增加 / 负数减少" @input="formDirty = true" />
      </label>
      <label class="field">
        <span class="field-label">调整原因</span>
        <input v-model="adjustForm.reason" class="input" :placeholder="adjustType === 'points' ? '例如：活动奖励' : '例如：违规扣除'" @input="formDirty = true" />
      </label>
      <template #footer>
        <button class="btn btn-primary" type="button" @click="submitAdjust">提交</button>
      </template>
    </Modal>

    <ConfirmDialog
      v-model="confirmOpen"
      title="操作确认"
      :content="`确认${confirmItem?.status === 'active' ? '禁用' : '启用'}用户「${confirmItem?.nickname || confirmItem?.phone}」？`"
      desc="状态变更后将影响该用户的登录和使用"
      confirm-text="确定"
      tone="danger"
      @confirm="doToggle"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { adminApi } from '../api/client';
import { badgeTone, formatDate, levelName } from '../constants';
import { useList } from '../composables/useList';
import { useToastStore } from '../stores/toast';
import StateView from '../components/StateView.vue';
import Pagination from '../components/Pagination.vue';
import Modal from '../components/Modal.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';

const toast = useToastStore();
const {
  list, loading, total, page, pageCount, keyword, extra, fetchList, search, clearSearch, setFilter, goPage,
} = useList((params) => adminApi.getUsers(params), { pageSize: 10 });

extra.value = { status: '' };
const statusOptions = [
  { label: '全部', value: '' },
  { label: '正常', value: 'active' },
  { label: '禁用', value: 'banned' },
];

const editOpen = ref(false);
const editUser = ref(null);
const editForm = ref({ nickname: '', company: '' });
const adjustOpen = ref(false);
const adjustUser = ref(null);
const adjustType = ref('points');
const adjustForm = ref({ delta: '', reason: '' });
const formDirty = ref(false);
const confirmOpen = ref(false);
const confirmItem = ref(null);

function openEdit(item) {
  editUser.value = item;
  editForm.value = { nickname: item.nickname || '', company: item.company || '' };
  formDirty.value = false;
  editOpen.value = true;
}

async function submitEdit() {
  if (!editForm.value.nickname?.trim()) {
    toast.error('昵称不能为空');
    return;
  }
  try {
    await adminApi.updateUser(editUser.value.id, editForm.value);
    toast.success('更新成功');
    formDirty.value = false;
    editOpen.value = false;
    fetchList(page.value);
  } catch (e) {
    toast.error(e.message);
  }
}

function openAdjust(item, type) {
  adjustType.value = type;
  adjustUser.value = item;
  adjustForm.value = { delta: '', reason: '' };
  formDirty.value = false;
  adjustOpen.value = true;
}

async function submitAdjust() {
  const delta = Number(adjustForm.value.delta);
  if (adjustForm.value.delta === '' || Number.isNaN(delta)) {
    toast.error('请输入调整数值');
    return;
  }
  const body = {
    delta,
    reason: adjustForm.value.reason || (adjustType.value === 'points' ? '管理员调整积分' : '管理员调整信用分'),
  };
  try {
    if (adjustType.value === 'points') await adminApi.adjustPoints(adjustUser.value.id, body);
    else await adminApi.adjustCredit(adjustUser.value.id, body);
    toast.success('调整成功');
    formDirty.value = false;
    adjustOpen.value = false;
    fetchList(page.value);
  } catch (e) {
    toast.error(e.message);
  }
}

function askToggle(item) {
  confirmItem.value = item;
  confirmOpen.value = true;
}

async function doToggle() {
  const item = confirmItem.value;
  if (!item) return;
  try {
    await adminApi.updateUser(item.id, { status: item.status === 'active' ? 'banned' : 'active' });
    toast.success('状态已更新');
    fetchList(page.value);
  } catch (e) {
    toast.error(e.message);
  }
}

onMounted(() => fetchList(1));
</script>

<style scoped>
.neg { color: var(--color-destructive); }
</style>
