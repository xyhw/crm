import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast, Tabs, Empty, Tag } from 'react-vant';
import { api } from '../api';
import PageNavBar from '../components/PageNavBar';
import Pagination from '../components/Pagination';
import { statusMeta, timeAgo } from '../constants';

const TABS = [
  { title: '我发布的', name: 'published' },
  { title: '我购买的', name: 'purchased' },
];

export default function MyOrders() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('published');
  const [page, setPage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
    setLoading(true);
    setPage(1);
    const req = tab === 'purchased'
      ? api.myOrders({ pageSize: 50 })
      : api.opportunities({ mine: 1, pageSize: 50 });
    req
      .then((res) => setList(res.list || []))
      .catch((e) => Toast.fail(e.message))
      .finally(() => setLoading(false));
  }, [tab]);

  const visible = list.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(list.length / pageSize);

  const renderItem = (item) => {
    const meta = statusMeta(item.status);
    const isPurchased = item.isPurchased;
    const isPublisher = item.isPublisher;

    return (
      <div className="order-card pressable" key={item.id} onClick={() => navigate(`/opportunity/${item.id}`)}>
        <div className="order-card__header">
          <div className="order-card__title">{item.title}</div>
          <div className="order-status">
            {isPublisher && <Tag color={meta.color} bg={meta.bg}>我发布</Tag>}
            {isPurchased && <Tag color="var(--success-color)" plain>我已购</Tag>}
            {!isPublisher && !isPurchased && <Tag color={meta.color} bg={meta.bg}>{meta.label}</Tag>}
          </div>
        </div>
        <div className="order-card__info">
          <span>{item.city || '未知城市'}</span>
          <span>{item.hotelName || '未知酒店'}</span>
        </div>
        <div className="order-card__footer">
          <div className="order-card__price">{item.price} 积分</div>
          <div className="order-card__stats">
            <Tag size="mini">{item.purchaseCount || 0} 人已购买</Tag>
            <span>{timeAgo(item.createdAt)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      <PageNavBar title="我的订单" onClickLeft={() => navigate(-1)} />

      <Tabs value={tab} onChange={setTab}>
        {TABS.map((t) => (
          <Tabs.TabPane key={t.name} title={t.title} name={t.name} />
        ))}
      </Tabs>

      {loading ? (
        <div className="empty-tip">加载中...</div>
      ) : list.length === 0 ? (
        <Empty description={tab === 'published' ? '暂无发布记录，去大厅发布第一条商机吧' : '暂无购买记录，去大厅看看'} className="empty-top" />
      ) : (
        <div className="order-list">
          {visible.map(renderItem)}
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          )}
        </div>
      )}
    </div>
  );
}
