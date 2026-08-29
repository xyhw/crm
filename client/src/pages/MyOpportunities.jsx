import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, Tag, Empty, Button, PullRefresh, List, Toast } from 'react-vant';
import PageNavBar from '../components/PageNavBar';
import { api } from '../api';
import { stageLabel, stageTone } from '../constants';
import { resolveCategoryIcon } from '../utils/category';
import Icon from '../components/Icon';
import { SkeletonList } from '../components/StateView';

const STATUS_META = {
  active: { label: '销售中', tone: 'verified' },
  inactive: { label: '已下架', tone: 'default' },
  invalid: { label: '已失效', tone: 'hot' },
};

export default function MyOpportunities() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchList = async (p = 1, reset = false) => {
    try {
      const res = await api.myOpportunities({ page: p, pageSize: 10 });
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
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchList(1, true);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchList(page + 1);
    }
  };

  return (
    <div className="page">
      <PageNavBar title="我发布的商机" onBack={() => navigate(-1)} />
      <PullRefresh onRefresh={onRefresh} successDuration={500}>
        <div className="my-opp-list">
          {loading && list.length === 0 ? (
            <SkeletonList count={4} />
          ) : list.length === 0 ? (
            <div className="empty-block">
              <Empty description="还没有发布过商机" />
              <Button type="primary" round onClick={() => navigate('/publish')}>立即发布</Button>
            </div>
          ) : (
            <List finished={!hasMore} onLoad={loadMore}>
              {list.map((item) => {
                const meta = STATUS_META[item.status] || STATUS_META.active;
                const editable = item.status !== 'invalid' && (item.purchaseCount || 0) === 0;
                return (
                  <div key={item.id} className="my-opp-card" onClick={() => navigate(`/opportunity/${item.id}`)}>
                    <div className="my-opp-card__head">
                      <Tag className={`opp-stage-tag ${meta.tone}`}>{meta.label}</Tag>
                      <span className="my-opp-card__time">{item.createdAt?.slice(0, 10)}</span>
                    </div>
                    <div className="my-opp-card__title">{item.title}</div>
                    <div className="my-opp-card__meta">
                      <span><Icon name={resolveCategoryIcon(item)} size={14} /> {item.hotelName || item.brand || '未知品牌'} · {item.city || '未知城市'}</span>
                      {item.stage && <span className={`opp-stage-tag ${stageTone(item.stage)}`}>{stageLabel(item.stage)}</span>}
                    </div>
                    <div className="my-opp-card__stats">
                      <span>{item.price} 积分</span>
                      <span>{item.purchaseCount || 0}人已购</span>
                      <span>{item.viewCount || 0}次浏览</span>
                    </div>
                    <div className="my-opp-card__actions">
                      {editable ? (
                        <Button size="small" type="primary" plain onClick={(e) => { e.stopPropagation(); navigate(`/publish?edit=${item.id}`); }}>编辑</Button>
                      ) : (
                        <span className="my-opp-card__locked">{item.status === 'invalid' ? '已被判无效' : '已有购买者'}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </List>
          )}
        </div>
      </PullRefresh>
    </div>
  );
}
