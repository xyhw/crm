import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast, Tabs, Empty, Badge } from 'react-vant';
import { api } from '../api';
import PageNavBar from '../components/PageNavBar';
import Pagination from '../components/Pagination';
import { timeAgo } from '../constants';

export default function Notifications() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
    setLoading(true);
    setPage(1);
    api.notifications({ type: type || undefined, pageSize: 50 })
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
      setList((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      Toast.success('已全部标记已读');
    } catch (e) {
      Toast.fail(e.message);
    }
  };

  const handleRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setList((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
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

  const totalPages = Math.ceil(list.length / pageSize);
  const visible = list.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="page">
      <PageNavBar
        title="通知中心"
        onClickLeft={() => navigate(-1)}
        right={unreadCount > 0 ? <span onClick={handleReadAll} className="text-primary navbar-action">全部已读</span> : undefined}
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
        <Empty description="暂无通知" className="empty-top" />
      ) : (
        <div className="notification-list">
          {visible.map((item) => (
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
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          )}
        </div>
      )}
    </div>
  );
}
