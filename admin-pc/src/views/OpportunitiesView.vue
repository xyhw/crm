<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">商机管理</h1>
        <p class="page-sub">上下架与详情查看</p>
      </div>
    </div>
    <div class="filter-bar">
      <input v-model="keyword" class="input filter-search" placeholder="搜索标题/酒店/城市" @keyup.enter="search" />
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
    <StateView :loading="loading" :empty="!loading && list.length === 0" empty-title="暂无商机">
      <div class="card table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>标题</th>
              <th>城市 / 酒店</th>
              <th>发布者</th>
              <th>定价</th>
              <th>购买</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id">
              <td>{{ item.title }}</td>
              <td>{{ item.city || '-' }} · {{ item.hotel_name || '-' }}</td>
              <td>{{ item.publisher_name || '-' }}</td>
              <td class="mono">{{ item.price }}</td>
              <td class="mono">{{ item.purchase_count || 0 }}</td>
              <td><span class="badge" :class="badgeTone(item.status)">{{ opportunityStatusLabel(item.status) }}</span></td>
              <td>{{ formatDate(item.created_at) }}</td>
              <td>
                <div class="row-actions">
                  <button class="btn btn-ghost" type="button" @click="openDetail(item)">详情</button>
                  <button
                    v-if="item.status === 'active'"
                    class="btn btn-danger-ghost"
                    type="button"
                    @click="askToggle(item)"
                  >下架</button>
                  <button
                    v-else-if="item.status === 'inactive'"
                    class="btn btn-ghost"
                    type="button"
                    @click="askToggle(item)"
                  >上架</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination :page="page" :page-count="pageCount" :total="total" @change="goPage" />
    </StateView>

    <Modal v-model="detailOpen" title="商机详情" wide>
      <template v-if="detail">
        <div class="kv"><span>城市</span><b>{{ detail.city || '-' }}</b></div>
        <div class="kv"><span>酒店</span><b>{{ detail.hotel_name || '-' }}</b></div>
        <div class="kv"><span>分类</span><b>{{ detail.category_name || '-' }}</b></div>
        <div class="kv"><span>发布者</span><b>{{ detail.publisher_name || '-' }}</b></div>
        <div class="kv"><span>定价</span><b>{{ detail.price }} 积分</b></div>
        <div class="kv"><span>销量 / 浏览</span><b>{{ detail.purchase_count }} / {{ detail.view_count }}</b></div>
        <div class="kv"><span>无效标记</span><b>{{ detail.invalid_mark_count || 0 }} 次</b></div>
        <div class="kv"><span>有效至</span><b>{{ detail.valid_until ? formatDate(detail.valid_until) : '-' }}</b></div>
        <div class="kv"><span>状态</span><b>{{ opportunityStatusLabel(detail.status) }}</b></div>
        <div class="kv"><span>阶段</span><b>{{ detail.stage || '-' }}</b></div>
        <div class="kv"><span>公开描述</span><b>{{ detail.description_public || '-' }}</b></div>
        <div class="kv"><span>完整描述</span><b>{{ detail.description_full || '-' }}</b></div>
        <div class="kv"><span>联系人</span><b>{{ detail.contact_name || '-' }} {{ detail.contact_phone || '-' }}</b></div>
        <div class="kv"><span>发布时间</span><b>{{ formatDate(detail.created_at) }}</b></div>
        <div v-if="detail.invalidMarks?.length">
          <div class="field-label">无效标记记录</div>
          <div v-for="m in detail.invalidMarks" :key="m.id" class="mark">
            {{ m.user_name || '-' }} · {{ m.reason || '-' }} · {{ formatDate(m.created_at) }}
          </div>
        </div>
      </template>
    </Modal>

    <ConfirmDialog
      v-model="confirmOpen"
      title="操作确认"
      :content="`确认${confirmNext === 'inactive' ? '下架' : '上架'}该商机？`"
      :confirm-text="confirmNext === 'inactive' ? '下架' : '上架'"
      :tone="confirmNext === 'inactive' ? 'danger' : 'primary'"
      @confirm="doToggle"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { adminApi } from '../api/client';
import { badgeTone, formatDate, opportunityStatusLabel } from '../constants';
import { useList } from '../composables/useList';
import { useToastStore } from '../stores/toast';
import StateView from '../components/StateView.vue';
import Pagination from '../components/Pagination.vue';
import Modal from '../components/Modal.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';

const toast = useToastStore();
const {
  list, loading, total, page, pageCount, keyword, extra, fetchList, search, clearSearch, setFilter, goPage,
} = useList((params) => adminApi.getOpportunities(params), { pageSize: 10 });

const statusOptions = [
  { label: '全部', value: '' },
  { label: '销售中', value: 'active' },
  { label: '已下架', value: 'inactive' },
  { label: '已失效', value: 'invalid' },
];

extra.value = { status: '' };
const detailOpen = ref(false);
const detail = ref(null);
const confirmOpen = ref(false);
const confirmItem = ref(null);
const confirmNext = ref('');

async function openDetail(item) {
  try {
    detail.value = await adminApi.getOpportunityDetail(item.id);
    detailOpen.value = true;
  } catch (e) {
    toast.error(e.message);
  }
}

function askToggle(item) {
  confirmItem.value = item;
  confirmNext.value = item.status === 'active' ? 'inactive' : 'active';
  confirmOpen.value = true;
}

async function doToggle() {
  if (!confirmItem.value) return;
  const next = confirmNext.value;
  try {
    await adminApi.updateOpportunity(confirmItem.value.id, { status: next });
    toast.success(next === 'inactive' ? '已下架' : '已上架');
    fetchList(page.value);
  } catch (e) {
    toast.error(e.message);
  }
}

onMounted(() => fetchList(1));
</script>

<style scoped>
.kv {
  display: flex;
  gap: 12px;
  font-size: 13px;
}
.kv span {
  width: 90px;
  color: var(--color-muted-fg);
  flex-shrink: 0;
}
.kv b {
  font-weight: 500;
}
.mark {
  font-size: 12px;
  color: var(--color-secondary);
  padding: 6px 0;
  border-bottom: 1px solid var(--color-border);
}
</style>
