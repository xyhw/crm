import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Toast, Dialog, Field, Grid, GridItem } from 'react-vant';
import { api } from '../api';
import { timeAgo } from '../constants';
import { BillO, CouponO, Invitation } from '@react-vant/icons';
import PageNavBar from '../components/PageNavBar';

export default function Points() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [recharging, setRecharging] = useState(false);

  useEffect(() => {
    Promise.all([
      api.pointsBalance(),
      api.pointsLogs({ pageSize: 10 }),
    ])
      .then(([balanceRes, logsRes]) => {
        setBalance(balanceRes);
        setLogs(logsRes.list || []);
      })
      .catch((e) => Toast.fail(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleRecharge = async () => {
    const amount = Number(rechargeAmount);
    if (!amount || amount <= 0) return Toast.fail('请输入有效金额');
    if (amount > 10000) return Toast.fail('单次充值上限10000积分');

    setRecharging(true);
    try {
      await api.recharge({ amount });
      Toast.success('充值成功');
      setShowRecharge(false);
      setRechargeAmount('');
      // 刷新数据
      const [balanceRes, logsRes] = await Promise.all([
        api.pointsBalance(),
        api.pointsLogs({ pageSize: 10 }),
      ]);
      setBalance(balanceRes);
      setLogs(logsRes.list || []);
    } catch (e) {
      Toast.fail(e.message);
    } finally {
      setRecharging(false);
    }
  };

  if (loading) return <div className="empty-tip">加载中...</div>;

  const rechargeOptions = [50, 100, 200, 500, 1000];

  return (
    <div className="page">
      <PageNavBar title="积分中心" onClickLeft={() => navigate(-1)} />

      {/* 积分余额卡片 */}
      <div className="points-card">
        <div className="points-card__label">当前积分</div>
        <div className="points-card__amount">{balance?.balance || 0}</div>
        <div className="points-card__stats">
          <span>已充值 {balance?.total_recharged || 0}</span>
          <span>已消耗 {balance?.total_consumed || 0}</span>
        </div>
        <Button type="primary" round size="small" onClick={() => setShowRecharge(true)}>
          充值积分
        </Button>
      </div>

      {/* 快捷入口 */}
      <Grid columnNum={3} style={{ marginBottom: 12 }}>
        <GridItem icon={<BillO width={22} height={22} />} text="积分流水" onClick={() => navigate('/points/flow')} />
        <GridItem icon={<CouponO width={22} height={22} />} text="购买记录" onClick={() => navigate('/my/orders')} />
        <GridItem icon={<Invitation width={22} height={22} />} text="邀请好友" onClick={() => navigate('/invite')} />
      </Grid>

      {/* 最近流水 */}
      <div className="section-head">
        <span className="section-title">最近流水</span>
        <span className="section-more" onClick={() => navigate('/points/flow')}>查看全部</span>
      </div>

      {logs.length === 0 ? (
        <div className="empty-tip">暂无流水记录</div>
      ) : (
        logs.map((log) => (
          <div className="points-log" key={log.id}>
            <div className="points-log__info">
              <div className="points-log__title">{log.source_title || log.source_type}</div>
              <div className="points-log__time">{timeAgo(log.created_at)}</div>
            </div>
            <div className={`points-log__amount ${log.delta > 0 ? 'positive' : 'negative'}`}>
              {log.delta > 0 ? `+${log.delta}` : log.delta}
            </div>
          </div>
        ))
      )}

      {/* 充值弹窗 */}
      <Dialog
        visible={showRecharge}
        title="充值积分"
        showCancelButton
        onConfirm={handleRecharge}
        onCancel={() => setShowRecharge(false)}
      >
        <div style={{ padding: '16px 0' }}>
          <div style={{ marginBottom: 12, color: '#666' }}>选择充值金额：</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {rechargeOptions.map((amount) => (
              <Button
                key={amount}
                size="small"
                type={Number(rechargeAmount) === amount ? 'primary' : 'default'}
                onClick={() => setRechargeAmount(String(amount))}
              >
                {amount} 积分
              </Button>
            ))}
          </div>
          <Field
            label="自定义金额"
            placeholder="输入积分数量"
            value={rechargeAmount}
            onChange={setRechargeAmount}
            type="digit"
          />
          <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>Mock 模式：充值即到账，无需支付</div>
        </div>
      </Dialog>
    </div>
  );
}
