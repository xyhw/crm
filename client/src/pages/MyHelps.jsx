import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, Tabs, List, Empty, Toast, Tag } from 'react-vant';
import { api } from '../api';
import { categoryIcon, timeAgo } from '../constants';

const HELP_TABS = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '跟进中' },
  { key: 'done', label: '已确认' },
  { key: 'rejected', label: '被拒绝' },
];

const MY_HELP_STATUS = {
  active: { label: '待提交报告', color: '#ed6a0c' },
  reported: { label: '待确认', color: '#1677ff' },
  confirmed: { label: '已确认', color: '#07c160' },
  rejected: { label: '被拒绝', color: '#969799' },
};

export default function MyHelps() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('all');
  const [list, setList] = useState([]);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const pageRef = useRef(1);

  const myHelpStatus = (order) => {
    const h = (order.helps || []).find((x) => x.userId && x.status !== 'rejected');
    if (!h) {
      const rejected = (order.helps || []).find((x) => x.status === 'rejected');
      return rejected ? MY_HELP_STATUS.rejected : { label: '已结束', color: '#969799' };
    }
    return MY_HELP_STATUS[h.status] || { label: h.statusLabel, color: '#969799' };
  };

  const load = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const page = pageRef.current;
      const res = await api.orders({ mine: 'helped', page, pageSize: 10 });
      const all = res.list || [];
      let items = all;
      if (tab === 'active') {
        items = all.filter((o) => o.helps.some((h) => h.status === 'active' || h.status === 'reported'));
      } else if (tab === 'done') {
        items = all.filter((o) => o.helps.some((h) => h.status === 'confirmed'));
      } else if (tab === 'rejected') {
        items = all.filter((o) => o.helps.some((h) => h.status === 'rejected'));
      }
      if (page === 1) {
        setList(items);
      } else {
        setList((prev) => [...prev, ...items]);
      }
      setFinished(items.length < 10);
      if (items.length > 0) pageRef.current += 1;
    } catch (e) {
      Toast.fail(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    pageRef.current = 1;
    setList([]);
    setFinished(false);
  }, [tab]);

  return (
    <div className="page">
      <NavBar title="我的互助" leftText="返回" onClickLeft={() => navigate(-1)} safeAreaInsetTop />
      <Tabs active={tab} onChange={setTab}>
        {HELP_TABS.map((t) => (
          <Tabs.TabPane key={t.key} title={t.label} />
        ))}
      </Tabs>
      <div className="my-list">
        <List finished={finished} onLoad={load} loadingText="加载中..." finishedText="没有更多了">
          {list.map((o) => {
            const st = myHelpStatus(o);
            return (
              <div className="myhelp-item" key={o.id} onClick={() => navigate(`/order/${o.id}`)}>
                <div className="myhelp-item__icon">{categoryIcon(o.category)}</div>
                <div className="myhelp-item__body">
                  <div className="myhelp-item__title text-ellipsis">{o.title}</div>
                  <div className="myhelp-item__meta">
                    {o.hotelName} · {o.categoryLabel} · {timeAgo(o.createdAt)}
                  </div>
                  <div className="myhelp-item__reward">
                    完成奖励 <b className="points-text">{o.reward} 积分</b>
                  </div>
                </div>
                <Tag color={st.color} style={{ flexShrink: 0 }}>
                  {st.label}
                </Tag>
              </div>
            );
          })}
        </List>
        {finished && list.length === 0 ? <Empty description="暂无互助记录，去大厅看看" /> : null}
      </div>
    </div>
  );
}
