import { useNavigate } from 'react-router-dom';
import { Tag } from 'react-vant';
import Icon from './Icon';
import { categoryIcon, statusMeta, timeAgo } from '../constants';

export default function OrderCard({ order }) {
  const navigate = useNavigate();
  const meta = statusMeta(order.status);

  return (
    <div className="order-card" onClick={() => navigate(`/order/${order.id}`)}>
      <div className="order-card__head flex-between">
        <div className="order-card__title text-ellipsis">
          <span className="order-card__icon">{categoryIcon(order.category)}</span>
          {order.title}
        </div>
        <Tag color={meta.color} style={{ flexShrink: 0 }}>
          {order.statusLabel}
        </Tag>
      </div>

      <div className="order-card__info">
        <div className="order-card__row">
          <span className="order-card__hotel text-ellipsis">
            <Icon name="shop-o" /> {order.hotelName}
            {order.city ? ` · ${order.city}` : ''}
          </span>
          <span className="points-text">{order.rewardLabel}</span>
        </div>
        <div className="order-card__row">
          <span className="order-card__meta">
            {order.categoryLabel} · {order.stageLabel}
          </span>
          <span className="order-card__time">{timeAgo(order.createdAt)}</span>
        </div>
      </div>

      {order.notes ? <div className="order-card__notes text-ellipsis">{order.notes}</div> : null}
    </div>
  );
}
