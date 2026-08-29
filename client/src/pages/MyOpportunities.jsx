import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Empty, Button, Pagination, Toast } from 'react-vant';
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

const PAGE_SIZE = 10;

export default function MyOpportunities() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchList = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.myOpportunities({ page: p, pageSize: PAGE_SIZE });
      setList(res.list || []);
      setTotal(res.total || 0);
      setPage(p);
    } catch (e) {
      Toast.fail(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList(1);
  }, []);

  const pageCount = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="page">
      <PageNavBar title="我发布的商机" onBack={() => navigate(-1)} />
      <div className="my-opp-list">
        {loading && list.length === 0 ? (
          <SkeletonList count={4} />
        ) : list.length === 0 ? (
          <div className="empty-block">
            <Empty description="还没有发布过商机" />
            <Button type="primary" round onClick={() => navigate('/publish')}>立即发布</Button>
          </div>
        ) : (
          <>
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
            <Pagination
              value={page}
              mode="multi"
              pageCount={pageCount}
              totalItems={total}
              itemsPerPage={PAGE_SIZE}
              showPageSize={5}
              onChange={fetchList}
              className="opp-pagination"
            />
          </>
        )}
      </div>
    </div>
  );
}
