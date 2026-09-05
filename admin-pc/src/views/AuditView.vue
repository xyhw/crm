<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">进度审核</h1>
        <p class="page-sub">跟进分享审核</p>
      </div>
    </div>
    <div class="filter-bar">
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
    <StateView :loading="loading" :empty="!loading && list.length === 0" empty-title="暂无审核记录">
      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>用户</th>
              <th>商机</th>
              <th>摘要</th>
              <th>状态</th>
              <th>时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id">
              <td>{{ item.user_name || '-' }}</td>
              <td>{{ item.opportunity_title || '-' }}</td>
              <td>{{ item.summary || '-' }}</td>
              <td><span class="badge" :class="badgeTone(item.status)">{{ followUpStatusLabel(item.status) }}</span></td>
              <td>{{ formatDateTime(item.created_at) }}</td>
              <td>
                <div v-if="item.status === 'pending'" class="row-actions">
                  <button class="btn btn-primary" type="button" @click="ask(item, 'approved')">通过</button>
                  <button class="btn btn-danger-ghost" type="button" @click="ask(item, 'rejected')">驳回</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination :page="page" :page-count="pageCount" :total="total" @change="goPage" />
    </StateView>
    <ConfirmDialog
      v-model="confirmOpen"
      title="审核确认"
      :content="`确认${confirmAction === 'approved' ? '通过' : '驳回'}该跟进分享？`"
      desc="该操作不可撤销"
      :confirm-text="confirmAction === 'approved' ? '通过' : '驳回'"
      :tone="confirmAction === 'rejected' ? 'danger' : 'primary'"
      @confirm="doAudit"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { adminApi } from '../api/client';
import { badgeTone, followUpStatusLabel, formatDateTime } from '../constants';
import { useList } from '../composables/useList';
import { useToastStore } from '../stores/toast';
import StateView from '../components/StateView.vue';
import Pagination from '../components/Pagination.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';

const toast = useToastStore();
const {
  list, loading, total, page, pageCount, extra, fetchList, setFilter, goPage,
} = useList((params) => adminApi.getAuditList(params), { pageSize: 10 });

extra.value = { status: '' };
const statusOptions = [
  { label: '全部', value: '' },
  { label: '待审核', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
];

const confirmOpen = ref(false);
const confirmItem = ref(null);
const confirmAction = ref('');

function ask(item, action) {
  confirmItem.value = item;
  confirmAction.value = action;
  confirmOpen.value = true;
}

async function doAudit() {
  if (!confirmItem.value) return;
  try {
    await adminApi.auditFollowUp(confirmItem.value.id, { status: confirmAction.value });
    toast.success(confirmAction.value === 'approved' ? '已通过' : '已驳回');
    fetchList(page.value);
  } catch (e) {
    toast.error(e.message);
  }
}

onMounted(() => fetchList(1));
</script>
