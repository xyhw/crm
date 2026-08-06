import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, Tag, Toast, Search, Tabs, Empty, PullRefresh, List } from 'react-vant';
import { api } from '../api';
import { SUPPLIER_CATEGORIES, timeAgo } from '../constants';

export default function Hall() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchList = async (p = 1, reset = false) => {
    try {
      const res = await api.opportunities({
        status: 'active',
        category: category || undefined,
        keyword: keyword || undefined,
        sort,
        page: p,
        pageSize: 10,
      });
      const newList = res.list || [];
      setList(reset ? newList : [...list, ...newList]);
      setHasMore(newList.length === 10);
      setPage(p);
    } catch (e) {
      Toast.fail(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchList(1, true);
  }, [category, sort]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchList(1, true);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchList(page + 1);
    }
  };

  const onSearch = () => {
    setLoading(true);
    fetchList(1, true);
  };

  const categoryTabs = [
    { title: '全部', value: '' },
    ...SUPPLIER_CATEGORIES.slice(0, 5).map((c) => ({ title: c.label, value: c.value })),
  ];

  return (
    <div className="page">
      <NavBar title="跟单大厅" leftArrow onClickLeft={() => navigate(-1)} safeAreaInsetTop />

      {/* 搜索栏 */}
      <Search
        value={keyword}
        onChange={setKeyword}
        onSearch={onSearch}
        placeholder="搜索跟单"
        shape="round"
        style={{ padding: '8px 12px' }}
      />

      {/* 分类筛选 */}
      <Tabs active={category} onChange={setCategory} shrink>
        {categoryTabs.map((tab) => (
          <Tabs.Tab key={tab.value} title={tab.title} name={tab.value} />
        ))}
      </Tabs>

      {/* 排序 */}
      <div className="sort-bar">
        <span className={sort === 'newest' ? 'active' : ''} onClick={() => setSort('newest')}>最新</span>
        <span className={sort === 'popular' ? 'active' : ''} onClick={() => setSort('popular')}>最热</span>
        <span className={sort === 'price_asc' ? 'active' : ''} onClick={() => setSort('price_asc')}>价格↑</span>
        <span className={sort === 'price_desc' ? 'active' : ''} onClick={() => setSort('price_desc')}>价格↓</span>
      </div>

      {/* 列表 */}
      <PullRefresh onRefresh={onRefresh} successDuration={500}>
        <List finished={!hasMore} onLoad={loadMore}>
          {loading && list.length === 0 ? (
            <div className="empty-tip">加载中...</div>
          ) : list.length === 0 ? (
            <Empty description="暂无跟单" style={{ marginTop: 40 }} />
          ) : (
            list.map((item) => (
              <div className="opportunity-card" key={item.id} onClick={() => navigate(`/opportunity/${item.id}`)}>
                <div className="opportunity-card__header">
                  <div className="opportunity-card__icon">{item.categoryIcon || '📦'}</div>
                  <div className="opportunity-card__info">
                    <div className="opportunity-card__title">{item.title}</div>
                    <div className="opportunity-card__meta">
                      {item.hotelName || '未知酒店'} · {item.city || '未知城市'}
                    </div>
                  </div>
                </div>
                <div className="opportunity-card__footer">
                  <div className="opportunity-card__price">{item.price} 积分</div>
                  <div className="opportunity-card__stats">
                    <Tag size="mini">{item.purchaseCount || 0}人已购</Tag>
                    <span className="opportunity-card__time">{timeAgo(item.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </List>
      </PullRefresh>
    </div>
  );
}
