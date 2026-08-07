import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, Toast, Tabs, Empty, Badge } from 'react-vant';
import { api } from '../api';
import { timeAgo } from '../constants';
import { ArrowLeft } from '@react-vant/icons';

export default function Notifications() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.notifications({ type: type || undefined, pageSize: 20 })
      .then((res) => {
        setList(res.list || []);
        setUnreadCount(res.unreadCount || 0);
      })
      .catch((e) => Toast.fail(e.message))
      .finally(() => setLoading(false));
  }, [type]);

  const handleReadAll = async () => {
    try {
      await api.markAllRead();
      setUnreadCount(0);
      Toast.success('已全部标记已读');
    } catch (e) {
      Toast.fail(e.message);
    }
  };

  const handleRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setList(list.map((n) => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (e) {
      Toast.fail(e.message);
    }
  };

  const typeTabs = [
    { title: '全部', name: '' },
    { title: '系统', name: 'system' },
    { title: '交易', name: 'trade' },
    { title: '互动', name: 'interaction' },
  ];

  return (
    <div className="page">
      <NavBar
        title="通知中心"
        leftArrow={<ArrowLeft width={20} height={20} />}
        onClickLeft={() => navigate(-1)}
        right={unreadCount > 0 ? <span onClick={handleReadAll} style={{ color: '#1677ff' }}>全部已读</span> : undefined}
        safeAreaInsetTop
      />

      <Tabs value={type} onChange={setType}>
        {typeTabs.map((tab) => (
          <Tabs.TabPane key={tab.name} title={tab.title} name={tab.name} badge={tab.name === '' && unreadCount > 0 ? unreadCount : undefined} />
        ))}
      </Tabs>

      {loading ? (
        <div className="empty-tip">加载中...</div>
      ) : list.length === 0 ? (
        <Empty description="暂无通知" style={{ marginTop: 40 }} />
      ) : (
        <div className="notification-list">
          {list.map((item) => (
            <div
              key={item.id}
              className={`notification-item ${!item.is_read ? 'unread' : ''}`}
              onClick={() => handleRead(item.id)}
            >
              <div className="notification-item__dot" />
              <div className="notification-item__content">
                <div className="notification-item__title">{item.title}</div>
                <div className="notification-item__desc">{item.content}</div>
                <div className="notification-item__time">{timeAgo(item.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
