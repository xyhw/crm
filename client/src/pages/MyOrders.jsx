import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, Toast, Tabs, Empty, Tag } from 'react-vant';
import { api } from '../api';
import { statusMeta, timeAgo } from '../constants';
import { ArrowLeft } from '@react-vant/icons';

export default function MyOrders() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.opportunities({ pageSize: 50 })
      .then((res) => setList(res.list || []))
      .catch((e) => Toast.fail(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Show orders where user is either publisher or purchaser
  const myOrders = list.filter((o) => o.isPublisher || o.isPurchased);

  return (
    <div className="page">
      <NavBar title="我的�订单" leftArrow={<ArrowLeft width={20} height={20} />} onClickLeft={() => navigate(-1)} safeAreaInsetTop />

      {loading ? (
        <div className="empty-tip">加载中...</div>
      ) : myOrders.length === 0 ? (
        <Empty description="�暂无�订单记录" style={{ marginTop: 40 }} />
      ) : (
        <div className="order-list">
          {myOrders.map((item) => {
            const meta = statusMeta(item.status);
            const isPurchased = item.isPurchased;
            const isPublisher = item.isPublisher;
            
            return (
              <div className="order-card" key={item.id} onClick={() => navigate(`/opportunity/${item.id}`)}>
                <div className="order-card__header">
                  <div className="order-card__title">{item.title}</div>
                  <div className="order-status">
                    {isPublisher && <Tag color={meta.color} bg={meta.bg}>我发布</Tag>}
                    {isPurchased && <Tag color="#07c160" plain>我已�购</Tag>}
                    {!isPublisher && !isPurchased && <Tag color={meta.color} bg={meta.bg}>{meta.label}</Tag>}
                  </div>
                </div>
                <div className="order-card__info">
                  <span>{item.city || '未知城市'}</span>
                  <span>{item.hotelName || '未知酒店'}</span>
                </div>
                <div className="order-card__footer">
                  <div className="order-card__price">{item.price} �积分</div>
                  <div className="order-card__stats">
                    <Tag size="mini">{item.purchaseCount || 0} 人已�购�买</Tag>
                    <span>{timeAgo(item.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
