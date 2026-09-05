<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">通知推送</h1>
      </div>
      <div class="row-actions">
        <button class="btn btn-ghost" type="button" @click="fetchList(page)">刷新</button>
        <button class="btn btn-primary" type="button" @click="openSend">发送通知</button>
      </div>
    </div>
    <StateView :loading="loading" :empty="!loading && list.length === 0" empty-title="暂无推送记录">
      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>标题</th>
              <th>内容</th>
              <th>接收人数</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, i) in list" :key="item.id || item.sent_time || i">
              <td>{{ item.title }}</td>
              <td>{{ item.content }}</td>
              <td>{{ item.recipient_count || 0 }}</td>
              <td>{{ formatDate(item.sent_time || item.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination :page="page" :page-count="pageCount" :total="total" @change="goPage" />
    </StateView>

    <Modal v-model="sendOpen" title="发送通知" :dirty="formDirty">
      <label class="field">
        <span class="field-label">标题<span class="required">*</span></span>
        <input v-model="sendForm.title" class="input" @input="formDirty = true" />
      </label>
      <label class="field">
        <span class="field-label">内容<span class="required">*</span></span>
        <textarea v-model="sendForm.content" class="textarea" @input="formDirty = true" />
      </label>
      <div class="tabs">
        <button class="tab" :class="{ active: sendForm.sendAll }" type="button" @click="sendForm.sendAll = true; formDirty = true">全部用户</button>
        <button class="tab" :class="{ active: !sendForm.sendAll }" type="button" @click="sendForm.sendAll = false; formDirty = true">指定用户</button>
      </div>
      <label v-if="!sendForm.sendAll" class="field">
        <span class="field-label">用户ID<span class="required">*</span></span>
        <textarea v-model="sendForm.userIds" class="textarea" placeholder="多个ID用逗号分隔" @input="formDirty = true" />
      </label>
      <template #footer>
        <button class="btn btn-primary" type="button" :disabled="sending" @click="send">{{ sending ? '发送中...' : '发送' }}</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { adminApi } from '../api/client';
import { formatDate } from '../constants';
import { useList } from '../composables/useList';
import { useToastStore } from '../stores/toast';
import StateView from '../components/StateView.vue';
import Pagination from '../components/Pagination.vue';
import Modal from '../components/Modal.vue';

const toast = useToastStore();
const {
  list, loading, total, page, pageCount, fetchList, goPage,
} = useList((params) => adminApi.getNotificationHistory(params), { pageSize: 10 });

const sendOpen = ref(false);
const sending = ref(false);
const formDirty = ref(false);
const sendForm = ref({ title: '', content: '', sendAll: true, userIds: '' });

function openSend() {
  sendForm.value = { title: '', content: '', sendAll: true, userIds: '' };
  formDirty.value = false;
  sendOpen.value = true;
}

async function send() {
  if (!sendForm.value.title?.trim()) { toast.error('标题不能为空'); return; }
  if (!sendForm.value.content?.trim()) { toast.error('内容不能为空'); return; }
  const body = {
    title: sendForm.value.title,
    content: sendForm.value.content,
  };
  if (sendForm.value.sendAll) {
    body.sendAll = true;
  } else {
    const ids = sendForm.value.userIds.split(',').map((s) => Number(s.trim())).filter((n) => n);
    if (!ids.length) { toast.error('请填写用户ID'); return; }
    body.userIds = ids;
  }
  sending.value = true;
  try {
    await adminApi.sendNotification(body);
    toast.success('已发送');
    formDirty.value = false;
    sendOpen.value = false;
    fetchList(1);
  } catch (e) {
    toast.error(e.message);
  } finally {
    sending.value = false;
  }
}

onMounted(() => fetchList(1));
</script>
