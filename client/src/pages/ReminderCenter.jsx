import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, Tabs, Empty, Toast } from 'react-vant';
import { api } from '../api';
import { timeAgo, followUpStatusLabel, formatDate } from '../constants';

export default function ReminderCenter() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('today');
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
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
      <NavBar title="提醒中心" leftArrow onClickLeft={() => navigate(-1)} safeAreaInsetTop />

      <Tabs active={tab} onChange={setTab}>
        {tabs.map((t) => (
          <Tabs.Tab key={t.name} title={t.title} name={t.name} />
        ))}
      </Tabs>

      {loading ? (
        <div className="empty-tip">加载中...</div>
      ) : reminders.length === 0 ? (
        <Empty description="暂无提醒" style={{ marginTop: 40 }} />
      ) : (
        <div className="reminder-list">
          {reminders.map((item) => (
            <div key={item.id} className="crm-card" onClick={() => navigate(`/crm/${item.crmOpportunityId}`)}>
              <div className="crm-card__header">
                <div className="crm-card__title text-ellipsis">{item.opportunityTitle || item.title}</div>
              </div>
              <div className="crm-card__info">
                <span>{item.city}</span>
                <span>{followUpStatusLabel(item.status)}</span>
              </div>
              <div className="crm-card__remind" style={{ color: tab === 'overdue' ? '#ee0a24' : '#ff976a' }}>
                {tab === 'today' ? '今日需跟进' : tab === 'overdue' ? '已逾期' : `到期日 ${formatDate(item.nextFollowDate)}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}