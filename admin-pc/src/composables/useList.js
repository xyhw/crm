import { computed, ref } from 'vue';
import { useToastStore } from '../stores/toast';

export function useList(fetcher, { pageSize = 10 } = {}) {
  const toast = useToastStore();
  const list = ref([]);
  const loading = ref(false);
  const total = ref(0);
  const page = ref(1);
  const keyword = ref('');
  const extra = ref({});

  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

  async function fetchList(p = page.value) {
    loading.value = true;
    try {
      const res = await fetcher({
        page: p,
        pageSize,
        keyword: keyword.value || undefined,
        ...extra.value,
      });
      if (Array.isArray(res)) {
        list.value = res;
        total.value = res.length;
      } else {
        list.value = res?.list || [];
        total.value = res?.total || 0;
      }
      page.value = p;
    } catch (e) {
      toast.error(e.message || '获取失败');
    } finally {
      loading.value = false;
    }
  }

  function search() {
    fetchList(1);
  }

  function clearSearch() {
    keyword.value = '';
    fetchList(1);
  }

  function setFilter(key, value) {
    extra.value = { ...extra.value, [key]: value };
    fetchList(1);
  }

  function goPage(p) {
    if (p < 1 || p > pageCount.value || p === page.value) return;
    fetchList(p);
  }

  return {
    list,
    loading,
    total,
    page,
    pageSize,
    pageCount,
    keyword,
    extra,
    fetchList,
    search,
    clearSearch,
    setFilter,
    goPage,
  };
}
