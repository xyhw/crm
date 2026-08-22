import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast, Cell, CellGroup, Progress, Empty, PullRefresh } from 'react-vant';
import { api } from '../api';
import PageNavBar from '../components/PageNavBar';
import Pagination from '../components/Pagination';
import { timeAgo } from '../constants';

const CHANGE_LABELS = {
  invalid_mark: '商机被判无效',
  share_report: '分享被举报',
  account_report: '账号被举报',
  purchase: '购买商机',
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
  const [page, setPage] = useState(1);
  const pageSize = 6;

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

  if (loading) return <div className="page"><PageNavBar title="信用分" onClickLeft={() => navigate(-1)} /><div className="empty-tip">加载中...</div></div>;

  const score = user?.creditScore ?? 100;
  const tone = score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger';
  const colorVar = `var(--${tone}-color)`;
  const label = score >= 80 ? '信用良好' : score >= 60 ? '信用一般' : '信用较差';

  return (
    <div className="page">
      <PageNavBar title="信用分" onClickLeft={() => navigate(-1)} />

      {/* 信用分卡片 */}
      <div className="credit-card">
        <div className="credit-card__score" style={{ color: colorVar }}>{score}</div>
        <div className="credit-card__label">{label}</div>
        <Progress percentage={score} color={colorVar} className="credit-progress" />
      </div>

      {/* 变动记录 */}
      <div className="section-title section-title--pad">信用分记录</div>
      <PullRefresh onRefresh={onRefresh} refreshing={refreshing}>
        {logs.length === 0 ? (
          <Empty description="暂无信用分变动记录" className="empty-top" />
        ) : (() => {
          const totalPages = Math.ceil(logs.length / pageSize);
          const visible = logs.slice((page - 1) * pageSize, page * pageSize);
          return (
            <CellGroup inset className="profile-section--gap">
              {visible.map((log) => (
                <Cell
                  key={log.id}
                  title={log.reason || CHANGE_LABELS[log.sourceType] || '信用分变动'}
                  label={timeAgo(log.createdAt)}
                  value={
                    <span className={`credit-delta ${log.changeAmount >= 0 ? 'text-success' : 'text-danger'}`}>
                      {log.changeAmount >= 0 ? `+${log.changeAmount}` : log.changeAmount}
                    </span>
                  }
                />
              ))}
              {totalPages > 1 && (
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              )}
            </CellGroup>
          );
        })()}
      </PullRefresh>

      {/* 说明 */}
      <CellGroup inset className="profile-section--gap">
        <Cell title="信用分说明" label="初始100分，根据您的行为动态调整" />
        <Cell title="80分以上" label="正常使用所有功能" />
        <Cell title="60-80分" label="投稿商机需要审核才能上架" />
        <Cell title="40-60分" label="禁止投稿，只能购买和跟进" />
        <Cell title="40分以下" label="账号封禁" />
      </CellGroup>
    </div>
  );
}
