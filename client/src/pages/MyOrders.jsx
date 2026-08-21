import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast, Tabs, Empty, Tag } from 'react-vant';
import { api } from '../api';
import PageNavBar from '../components/PageNavBar';
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

  useEffect(() => {
    api.opportunities({ pageSize: 50 })
      .then((res) => setList(res.list || []))
      .catch((e) => Toast.fail(e.message))
      .finally(() => setLoading(false));
  }, []);

  const published = list.filter((o) => o.isPublisher);
  const purchased = list.filter((o) => o.isPurchased);
  const current = tab === 'published' ? published : purchased;

  const renderItem = (item) => {
    const meta = statusMeta(item.status);
    const isPurchased = item.isPurchased;
    const isPublisher = item.isPublisher;

    return (
      <div className="order-card" key={item.id} onClick={() => navigate(`/opportunity/${item.id}`)}>
        <div className="order-card__header">
          <div className="order-card__title">{item.title}</div>
          <div className="order-status">
            {isPublisher && <Tag color={meta.color} bg={meta.bg}>我发布</Tag>}
            {isPurchased && <Tag color="#148a57" plain>我已购</Tag>}
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
      ) : current.length === 0 ? (
        <Empty description={tab === 'published' ? '暂无发布记录，去大厅发布第一条商机吧' : '暂无购买记录，去大厅看看'} style={{ marginTop: 40 }} />
      ) : (
        <div className="order-list">
          {current.map(renderItem)}
        </div>
      )}
    </div>
  );
}
