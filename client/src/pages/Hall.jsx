import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Toast, Search, PullRefresh, List } from 'react-vant';
import { api } from '../api';
import PageNavBar from '../components/PageNavBar';
import Icon from '../components/Icon';
import { SkeletonList } from '../components/StateView';
import { SUPPLIER_CATEGORIES, timeAgo, stageLabel } from '../constants';
import { resolveCategoryIcon } from '../utils/category';

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
      setList(reset ? newList : (prev) => [...prev, ...newList]);
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
    ...SUPPLIER_CATEGORIES.map((c) => ({ title: c.label, value: c.value })),
  ];

  return (
    <div className="page">
      <PageNavBar title="商机大厅" onClickLeft={() => navigate(-1)} />

      {/* 搜索栏 */}
      <Search
        value={keyword}
        onChange={setKeyword}
        onSearch={onSearch}
        placeholder="搜索商机"
        shape="round"
        className="search-bar"
      />

      {/* 分类筛选 */}
      <div className="category-tabs">
        {categoryTabs.map((tab) => (
          <span
            key={tab.value}
            className={`category-tab ${category === tab.value ? 'active' : ''}`}
            onClick={() => { setCategory(tab.value); setPage(1); }}
          >
            {tab.title}
          </span>
        ))}
      </div>

      {/* 排序 */}
      <div className="sort-bar">
        <span className={sort === 'newest' ? 'active' : ''} onClick={() => setSort('newest')}>最新</span>
        <span className={sort === 'popular' ? 'active' : ''} onClick={() => setSort('popular')}>最热</span>
        <span className={sort === 'price_asc' ? 'active' : ''} onClick={() => setSort('price_asc')}>
          价格<Icon name="ascending" size={12} />
        </span>
        <span className={sort === 'price_desc' ? 'active' : ''} onClick={() => setSort('price_desc')}>
          价格<Icon name="descending" size={12} />
        </span>
      </div>

      {/* 列表 */}
      <PullRefresh onRefresh={onRefresh} successDuration={500}>
        <List finished={!hasMore} onLoad={loadMore}>
          {loading && list.length === 0 ? (
            <SkeletonList count={4} />
          ) : list.length === 0 ? (
            <div className="state-empty">
              <div className="state-empty__title">暂无商机</div>
              <div className="state-empty__desc">换个分类或关键词试试</div>
            </div>
          ) : (
            list.map((item) => (
              <div
                className={`opportunity-card pressable ${item.isPurchased ? 'purchased' : ''}`}
                key={item.id}
                role="button"
                tabIndex={0}
                aria-label={`查看商机：${item.title}`}
                onClick={() => navigate(`/opportunity/${item.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/opportunity/${item.id}`);
                  }
                }}
              >
                <div className="opportunity-card__header">
                  <div className="cat-icon">
                    <Icon name={resolveCategoryIcon(item)} size={24} />
                  </div>
                  <div className="opportunity-card__info">
                    <div className="opportunity-card__title">
                      {item.isPurchased && (
                        <span className="opportunity-card__purchased-mark" aria-label="已购买">
                          <Icon name="success" size={11} color="#ffffff" />
                        </span>
                      )}
                      <span className="opportunity-card__title-text">{item.title}</span>
                      {item.isPurchased && <span className="opportunity-card__purchased-tag">已解锁</span>}
                    </div>
                    <div className="opportunity-card__meta">
                      <span className="opportunity-card__meta-text">
                        {item.hotelName || item.brand || '未知品牌'} · {item.city || '未知城市'}
                      </span>
                      {item.stage && <span className="opp-stage-tag">{stageLabel(item.stage)}</span>}
                    </div>
                    {item.isPurchased && (() => {
                      try {
                        const viewed = parseInt(localStorage.getItem(`viewedShares_${item.id}`) || '0', 10);
                        const newCount = Math.max(0, (item.totalShares || 0) - viewed);
                        if (newCount > 0) {
                          return (
                            <div className="opportunity-card__new-share">
                              {newCount} 条新共享跟进
                            </div>
                          );
                        }
                      } catch {}
                      return null;
                    })()}
                  </div>
                </div>
                <div className="opportunity-card__footer">
                  <div className="opportunity-card__price">
                    {item.isPurchased ? (
                      <>{item.price} 积分</>
                    ) : (
                      <>
                        <Icon name="lock" size={12} className="opportunity-card__lock-icon" />
                        {item.price} 积分
                      </>
                    )}
                  </div>
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
