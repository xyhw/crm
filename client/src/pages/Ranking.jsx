import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast, Tabs, Empty } from 'react-vant';
import { api } from '../api';
import PageNavBar from '../components/PageNavBar';

export default function Ranking() {
  const navigate = useNavigate();
  const [type, setType] = useState('publisher');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.rankings({ type, pageSize: 20 })
      .then((res) => setList(res.list || []))
      .catch((e) => Toast.fail(e.message))
      .finally(() => setLoading(false));
  }, [type]);

  return (
    <div className="page">
      <PageNavBar title="排行榜" onClickLeft={() => navigate(-1)} />

      <Tabs value={type} onChange={setType}>
        <Tabs.TabPane title="跟单达人榜" name="publisher" />
        <Tabs.TabPane title="贡献榜" name="contributor" />
      </Tabs>

      {loading ? (
        <div className="empty-tip">加载中...</div>
      ) : list.length === 0 ? (
        <Empty description="暂无排行数据" style={{ marginTop: 40 }} />
      ) : (
        <div className="ranking-list">
          {list.map((item) => (
            <div className="ranking-item" key={item.id}>
              <div className={`ranking-item__rank ${item.rank <= 3 ? 'top' : ''}`}>
                {item.rank}
              </div>
              <div className="ranking-item__avatar">{item.nickname?.[0] || '匿'}</div>
              <div className="ranking-item__info">
                <div className="ranking-item__name">{item.nickname || '匿名用户'}</div>
                <div className="ranking-item__score">
                  {type === 'publisher' ? `${item.purchase_count || 0} 次购买` : `${item.helpful_count || 0} 次有用`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
