import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, Empty, Toast } from 'react-vant';
import { api } from '../api';
import { formatTime } from '../constants';

export default function Redemptions() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .redemptions()
      .then((res) => setList(res.list || []))
      .catch((e) => Toast.fail(e.message))
      .finally(() => setLoaded(true));
  }, []);

  const statusMap = { pending: { label: '待处理', color: '#ed6a0c' }, done: { label: '已完成', color: '#07c160' } };

  return (
    <div className="page">
      <NavBar title="兑换记录" leftText="返回" onClickLeft={() => navigate(-1)} safeAreaInsetTop />
      {loaded && list.length === 0 ? (
        <Empty description="暂无兑换记录" />
      ) : (
        list.map((r) => {
          const st = statusMap[r.status] || { label: r.status, color: '#969799' };
          return (
            <div className="points-item" key={r.id}>
              <div>
                <div className="points-item__title">{r.productName}</div>
                <div className="points-item__time">{formatTime(r.createdAt)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="points-item__delta delta-out">-{r.cost}</div>
                <div className="points-item__time" style={{ color: st.color, marginTop: 4 }}>
                  {st.label}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
