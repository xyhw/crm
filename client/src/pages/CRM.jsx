import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, Tag, Toast, Button, Search, Tabs, Empty } from 'react-vant';
import { api } from '../api';
import { categoryIcon, followUpStatusMeta, timeAgo } from '../constants';

export default function CRM() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchList = async (p = 1, reset = false) => {
    try {
      const res = await api.crmList({ status, keyword, page: p, pageSize: 10 });
      const newList = res.list || [];
      setList(reset ? newList : [...list, ...newList]);
      setHasMore(newList.length === 10);
      setPage(p);
    } catch (e) {
      Toast.fail(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchList(1, true);
  }, [status, keyword]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchList(page + 1);
    }
  };

  const statusTabs = [
    { title: '全部', name: '' },
    { title: '待跟进', name: 'pending' },
    { title: '跟进中', name: 'following' },
    { title: '已成交', name: 'closed' },
    { title: '已放弃', name: 'abandoned' },
  ];

  return (
    <div className="page">
      <NavBar title="我的CRM" leftArrow onClickLeft={() => navigate(-1)} safeAreaInsetTop />

      {/* 搜索栏 */}
      <Search
        value={keyword}
        onChange={setKeyword}
        placeholder="搜索跟单"
        shape="round"
        style={{ padding: '8px 12px' }}
      />

      {/* 状态筛选 */}
      <Tabs active={status} onChange={setStatus} shrink>
        {statusTabs.map((tab) => (
          <Tabs.Tab key={tab.name} title={tab.title} name={tab.name} />
        ))}
      </Tabs>

      {/* 列表 */}
      <div className="crm-list">
        {loading && list.length === 0 ? (
          <div className="empty-tip">加载中...</div>
        ) : list.length === 0 ? (
          <Empty description="暂无CRM跟单" style={{ marginTop: 40 }} />
        ) : (
          list.map((item) => {
            const statusMeta = followUpStatusMeta(item.status);
            return (
              <div className="crm-card" key={item.id} onClick={() => navigate(`/crm/${item.id}`)}>
                <div className="crm-card__header">
                  <div className="crm-card__icon">{item.category_icon || '📦'}</div>
                  <div className="crm-card__title">{item.title || '手动录入跟单'}</div>
                </div>
                <div className="crm-card__info">
                  <span>{item.city || '未知城市'}</span>
                  <span>{item.hotel_name || '未知酒店'}</span>
                  <span>{item.category_name || '其他'}</span>
                </div>
                <div className="crm-card__footer">
                  <Tag color={statusMeta.color} bg={statusMeta.bg}>{statusMeta.label}</Tag>
                  <span className="crm-card__time">{item.follow_up_count || 0} 次跟进</span>
                </div>
                {item.next_follow_date && (
                  <div className="crm-card__remind">
                    下次跟进：{new Date(item.next_follow_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 加载更多 */}
      {hasMore && list.length > 0 && (
        <div className="load-more" onClick={loadMore}>
          {loading ? '加载中...' : '加载更多'}
        </div>
      )}

      {/* 手动录入按钮 */}
      <Button
        type="primary"
        round
        icon={<span style={{ fontSize: 18 }}>+</span>}
        style={{ position: 'fixed', bottom: 80, right: 20 }}
        onClick={() => navigate('/crm/add')}
      />
    </div>
  );
}
