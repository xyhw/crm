import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, Tag, Toast, Button, Badge } from 'react-vant';
import Icon from '../components/Icon';
import { SkeletonList } from '../components/StateView';
import HomeBanner from '../components/HomeBanner';
import AnnouncementBar from '../components/AnnouncementBar';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { categoryLabel, statusMeta, timeAgo, levelMeta } from '../constants';
import { resolveCategoryIcon } from '../utils/category';

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
        title="商机互助"
        safeAreaInsetTop
        right={
          <Badge content={unreadCount > 0 ? unreadCount : ''} showZero={false}>
            <Icon name="bell" size={22} onClick={() => navigate('/notifications')} />
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

      {/* 公告栏 */}
      <AnnouncementBar />

      {/* 用户卡片 */}
      <div className="home-user">
        <div className="home-user__top">
          <div className="home-user__avatar">{user?.nickname?.[0] || '友'}</div>
          <div className="home-user__info">
            <div className="home-user__name">{user?.nickname || '未登录'}</div>
            <Tag className="home-user__level-tag">{level.label}</Tag>
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
            <div className="home-user__stat-num">{level.label}</div>
            <div className="home-user__stat-label">会员等级</div>
          </div>
        </div>
      </div>

      {/* Banner轮播 */}
      <HomeBanner />

      {/* 快捷入口 */}
      <div className="home-entry">
        <div className="home-entry__item home-entry__item--primary" onClick={() => navigate('/opportunities')}>
          <Icon name="search" size={26} />
          <span>商机大厅</span>
        </div>
        <div className="home-entry__item home-entry__item--accent" onClick={() => navigate('/publish')}>
          <Icon name="edit" size={26} />
          <span>发布商机</span>
        </div>
        <div className="home-entry__item home-entry__item--success" onClick={() => navigate('/crm')}>
          <Icon name="contact" size={26} />
          <span>我的CRM</span>
        </div>
        <div className="home-entry__item home-entry__item--warning" onClick={() => navigate('/ranking')}>
          <Icon name="medal-o" size={26} />
          <span>排行榜</span>
        </div>
      </div>

      {/* 最新商机 */}
      <div className="flex-between section-head">
        <span className="section-title">最新商机</span>
        <span className="section-more" onClick={() => navigate('/opportunities')}>
          查看全部 <Icon name="arrow" size={12} />
        </span>
      </div>

      {loading ? (
        <SkeletonList count={3} />
      ) : orders.length === 0 ? (
        <div className="home-empty">
          <div className="home-empty__title">暂无商机</div>
          <div className="home-empty__desc">发布你的第一条商机，互助从你开始</div>
          <Button type="primary" size="small" round onClick={() => navigate('/publish')}>
            立即发布
          </Button>
        </div>
      ) : (
        orders.map((o) => (
          <div
            className="home-order pressable"
            key={o.id}
            role="button"
            tabIndex={0}
            aria-label={`查看商机：${o.title}`}
            onClick={() => navigate(`/opportunity/${o.id}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate(`/opportunity/${o.id}`);
              }
            }}
          >
            <div className="home-order__icon">
              <div className="cat-icon cat-icon--sm">
                <Icon name={resolveCategoryIcon(o)} size={22} />
              </div>
            </div>
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
