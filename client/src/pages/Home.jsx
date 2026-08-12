import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, Tag, Toast, Button, Badge } from 'react-vant';
import Icon from '../components/Icon';
import HomeBanner from '../components/HomeBanner';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { categoryIcon, categoryLabel, statusMeta, timeAgo, levelMeta } from '../constants';

export default function Home() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [todayReminders, setTodayReminders] = useState(0);

  useEffect(() => {
    Promise.all([
      api.opportunities({ status: 'active', pageSize: 5, sort: 'newest' }),
      api.myStats().catch(() => null),
      api.notifications({ pageSize: 1 }).catch(() => ({})),
      api.reminders({ type: 'today' }).catch(() => ({})),
    ])
      .then(([ordersRes, statsRes, notifRes, reminderRes]) => {
        setOrders(ordersRes.list || []);
        setStats(statsRes);
        setUnreadCount(notifRes.unreadCount || 0);
        setTodayReminders((reminderRes.list || []).length);
      })
      .catch((e) => Toast.fail(e.message))
      .finally(() => setLoading(false));
    refreshUser().catch(() => {});
  }, []);

  const level = levelMeta(user?.level || 'normal');
  const hasReminder = unreadCount > 0 || todayReminders > 0;

  return (
    <div className="page">
      <NavBar
        title="跟单互助"
        safeAreaInsetTop
        right={
          <Badge content={unreadCount > 0 ? unreadCount : ''} showZero={false}>
            <Icon name="bell" size={22} color="#323233" onClick={() => navigate('/notifications')} />
          </Badge>
        }
      />

      {(hasReminder) && (
        <div className="home-reminder-bar">
          {todayReminders > 0 && (
            <span className="home-reminder-bar__item" onClick={() => navigate('/reminders')}>
              {todayReminders} 条今日待跟进
            </span>
          )}
          {unreadCount > 0 && (
            <span className="home-reminder-bar__item" onClick={() => navigate('/notifications')}>
              {unreadCount} 条未读通知
            </span>
          )}
        </div>
      )}

      {/* 用户卡片 */}
      <div className="home-user">
        <div className="home-user__top">
          <div className="home-user__avatar">{user?.nickname?.[0] || '友'}</div>
          <div className="home-user__info">
            <div className="home-user__name">{user?.nickname || '未登录'}</div>
            <Tag color="#fff" style={{ background: level.color }}>
              {level.label}
            </Tag>
          </div>
          <div className="home-user__points" onClick={() => navigate('/points')}>
            <div className="home-user__points-num">{user?.pointsBalance ?? 0}</div>
            <div className="home-user__points-label">我的积分</div>
          </div>
        </div>
        <div className="home-user__stats">
          <div className="home-user__stat" onClick={() => navigate('/my/orders')}>
            <div className="home-user__stat-num">{stats?.published ?? 0}</div>
            <div className="home-user__stat-label">我的投稿</div>
          </div>
          <div className="home-user__stat" onClick={() => navigate('/crm')}>
            <div className="home-user__stat-num">{stats?.crm ?? 0}</div>
            <div className="home-user__stat-label">我的CRM</div>
          </div>
          <div className="home-user__stat" onClick={() => navigate('/member-level')}>
            <div className="home-user__stat-num" style={{ color: level.color }}>{level.label}</div>
            <div className="home-user__stat-label">会员等级</div>
          </div>
        </div>
      </div>

      {/* Banner轮播 */}
      <HomeBanner />

      {/* 快捷入口 */}
      <div className="home-entry">
        <div className="home-entry__item" onClick={() => navigate('/opportunities')}>
          <Icon name="search" size={26} color="#1677ff" />
          <span>跟单大厅</span>
        </div>
        <div className="home-entry__item" onClick={() => navigate('/publish')}>
          <Icon name="edit" size={26} color="#ed6a0c" />
          <span>发布跟单</span>
        </div>
        <div className="home-entry__item" onClick={() => navigate('/crm')}>
          <Icon name="contact" size={26} color="#07c160" />
          <span>我的CRM</span>
        </div>
        <div className="home-entry__item" onClick={() => navigate('/ranking')}>
          <Icon name="medal-o" size={26} color="#ff976a" />
          <span>排行榜</span>
        </div>
      </div>

      {/* 最新跟单 */}
      <div className="flex-between section-head">
        <span className="section-title">最新跟单</span>
        <span className="section-more" onClick={() => navigate('/opportunities')}>
          查看全部 <Icon name="arrow" size={12} />
        </span>
      </div>

      {loading ? (
        <div className="empty-tip">加载中...</div>
      ) : orders.length === 0 ? (
        <div className="home-empty">
          <div className="home-empty__title">暂无跟单</div>
          <div className="home-empty__desc">发布你的第一条跟单，互助从你开始</div>
          <Button type="primary" size="small" round onClick={() => navigate('/publish')}>
            立即发布
          </Button>
        </div>
      ) : (
        orders.map((o) => (
          <div className="home-order" key={o.id} onClick={() => navigate(`/opportunity/${o.id}`)}>
            <div className="home-order__icon">{o.categoryIcon || '📦'}</div>
            <div className="home-order__body">
              <div className="home-order__title text-ellipsis">{o.title}</div>
              <div className="home-order__meta">
                {o.hotelName || '未知酒店'} · {o.categoryName || '未知分类'} · {o.city || '未知城市'}
              </div>
              <div className="home-order__meta">
                <Tag size="mini" type="primary">{o.purchaseCount || 0}人已购买</Tag>
              </div>
            </div>
            <div className="home-order__right">
              <div className="points-text">{o.price} 积分</div>
              <div className="home-order__time">{timeAgo(o.createdAt)}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
