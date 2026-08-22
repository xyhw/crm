import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, Empty, Toast } from 'react-vant';
import { api } from '../api';
import PageNavBar from '../components/PageNavBar';
import Pagination from '../components/Pagination';
import { timeAgo, followUpStatusLabel, formatDate } from '../constants';

export default function ReminderCenter() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('today');
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
    setLoading(true);
    setPage(1);
    api.reminders({ type: tab })
      .then((res) => setReminders(res.list || []))
      .catch((e) => Toast.fail(e.message))
      .finally(() => setLoading(false));
  }, [tab]);

  const tabs = [
    { title: '今日待跟进', name: 'today' },
    { title: '逾期未跟进', name: 'overdue' },
    { title: '即将到期', name: 'upcoming' },
  ];

  return (
    <div className="page">
      <PageNavBar title="提醒中心" onClickLeft={() => navigate(-1)} />

      <Tabs value={tab} onChange={setTab}>
        {tabs.map((t) => (
          <Tabs.TabPane key={t.name} title={t.title} name={t.name} />
        ))}
      </Tabs>

      {loading ? (
        <div className="empty-tip">加载中...</div>
      ) : reminders.length === 0 ? (
        <Empty description="暂无提醒" className="empty-top" />
      ) : (() => {
        const totalPages = Math.ceil(reminders.length / pageSize);
        const visible = reminders.slice((page - 1) * pageSize, page * pageSize);
        return (
          <div className="reminder-list">
            {visible.map((item) => (
              <div key={item.id} className="crm-card pressable" onClick={() => navigate(`/crm/${item.crmOpportunityId}`)}>
                <div className="crm-card__header">
                  <div className="crm-card__title text-ellipsis">{item.opportunityTitle || item.title}</div>
                </div>
                <div className="crm-card__info">
                  <span>{item.city || '未知城市'}</span>
                  <span>{followUpStatusLabel(item.status)}</span>
                </div>
                <div className={`crm-card__remind ${tab === 'overdue' ? 'text-danger' : 'text-warning'}`}>
                  {tab === 'today' ? '今日需跟进' : tab === 'overdue' ? '已逾期' : `到期日 ${formatDate(item.nextFollowDate)}`}
                </div>
              </div>
            ))}
            {totalPages > 1 && (
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            )}
          </div>
        );
      })()}
    </div>
  );
}