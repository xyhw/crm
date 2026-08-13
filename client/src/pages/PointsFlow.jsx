import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast, Tabs, Empty } from 'react-vant';
import { api } from '../api';
import PageNavBar from '../components/PageNavBar';
import { timeAgo } from '../constants';

export default function PointsFlow() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('');

  useEffect(() => {
    setLoading(true);
    api.pointsLogs({ type: type || undefined, pageSize: 30 })
      .then((res) => setList(res.list || []))
      .catch((e) => Toast.fail(e.message))
      .finally(() => setLoading(false));
  }, [type]);

  const typeTabs = [
    { title: '全部', name: '' },
    { title: '收入', name: 'income' },
    { title: '支出', name: 'expense' },
  ];

  return (
    <div className="page">
      <PageNavBar title="积分流水" onClickLeft={() => navigate(-1)} />

      <Tabs value={type} onChange={setType}>
        {typeTabs.map((tab) => (
          <Tabs.TabPane key={tab.name} title={tab.title} name={tab.name} />
        ))}
      </Tabs>

      {loading ? (
        <div className="empty-tip">加载中...</div>
      ) : list.length === 0 ? (
        <Empty description="暂无流水记录" style={{ marginTop: 40 }} />
      ) : (
        <div className="points-flow-list">
          {list.map((item) => (
            <div className="points-flow-item" key={item.id}>
              <div className="points-flow-item__info">
                <div className="points-flow-item__title">{item.source_title || item.source_type}</div>
                <div className="points-flow-item__time">{timeAgo(item.created_at)}</div>
              </div>
              <div className={`points-flow-item__amount ${item.delta > 0 ? 'positive' : 'negative'}`}>
                {item.delta > 0 ? `+${item.delta}` : item.delta}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
