import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast, Cell, CellGroup, Progress, Empty, PullRefresh } from 'react-vant';
import { api } from '../api';
import PageNavBar from '../components/PageNavBar';
import { timeAgo } from '../constants';

const CHANGE_LABELS = {
  invalid_mark: '跟单被判无效',
  share_report: '分享被举报',
  account_report: '账号被举报',
  purchase: '购买跟单',
  share_helpful: '分享被认可',
  weekly_active: '活跃奖励',
  admin_adjust: '管理员调整',
};

export default function Credit() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async () => {
    const res = await api.credits({ page: 1, pageSize: 50 });
    setLogs(res.list || []);
    return res;
  };

  useEffect(() => {
    Promise.all([api.me(), fetchLogs()])
      .then(([me]) => setUser(me))
      .catch((e) => Toast.fail(e.message))
      .finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const [me] = await Promise.all([api.me(), fetchLogs()]);
      setUser(me);
      Toast.success('已刷新');
    } catch (e) {
      Toast.fail(e.message);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <div className="empty-tip">加载中...</div>;

  const score = user?.creditScore ?? 100;
  const color = score >= 80 ? '#07c160' : score >= 60 ? '#ff976a' : '#ee0a24';
  const label = score >= 80 ? '信用良好' : score >= 60 ? '信用一般' : '信用较差';

  return (
    <div className="page">
      <PageNavBar title="信用分" onClickLeft={() => navigate(-1)} />

      {/* 信用分卡片 */}
      <div className="credit-card">
        <div className="credit-card__score" style={{ color }}>{score}</div>
        <div className="credit-card__label">{label}</div>
        <Progress percentage={score} color={color} style={{ marginTop: 12 }} />
      </div>

      {/* 变动记录 */}
      <div className="section-title" style={{ padding: '12px 16px 4px' }}>信用分记录</div>
      <PullRefresh onRefresh={onRefresh} refreshing={refreshing}>
        {logs.length === 0 ? (
          <Empty description="暂无信用分变动记录" style={{ padding: '40px 0' }} />
        ) : (
          <CellGroup inset style={{ marginTop: 4 }}>
            {logs.map((log) => (
              <Cell
                key={log.id}
                title={log.reason || CHANGE_LABELS[log.sourceType] || '信用分变动'}
                label={timeAgo(log.createdAt)}
                value={
                  <span style={{ color: log.changeAmount >= 0 ? '#07c160' : '#ee0a24', fontWeight: 600 }}>
                    {log.changeAmount >= 0 ? `+${log.changeAmount}` : log.changeAmount}
                  </span>
                }
              />
            ))}
          </CellGroup>
        )}
      </PullRefresh>

      {/* 说明 */}
      <CellGroup inset style={{ marginTop: 12 }}>
        <Cell title="信用分说明" label="初始100分，根据您的行为动态调整" />
        <Cell title="80分以上" label="正常使用所有功能" />
        <Cell title="60-80分" label="投稿跟单需要审核才能上架" />
        <Cell title="40-60分" label="禁止投稿，只能购买和跟进" />
        <Cell title="40分以下" label="账号封禁" />
      </CellGroup>
    </div>
  );
}
