import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Toast, Dialog, Field, Grid, GridItem } from 'react-vant';
import { api } from '../api';
import { timeAgo } from '../constants';
import { BillO, CouponO, Invitation } from '@react-vant/icons';
import PageNavBar from '../components/PageNavBar';

export default function Points() {
  const navigate = useNavigate();
  const location = useLocation();
  const [balance, setBalance] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeChannel, setRechargeChannel] = useState('mock');
  const [recharging, setRecharging] = useState(false);
  const [channelsData, setChannelsData] = useState({ channels: ['mock'], defaultChannel: 'mock' });

  useEffect(() => {
    // 从支付结果页点“重新充值”返回时，自动弹起充值弹窗
    if (location.state?.reopenRecharge) {
      setShowRecharge(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

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

    api.rechargeChannels()
      .then((data) => {
        setChannelsData(data);
        setRechargeChannel(data.defaultChannel || 'mock');
      })
      .catch(() => {});
  }, []);

  const handleRecharge = async () => {
    const amount = Number(rechargeAmount);
    if (!amount || amount <= 0) return Toast.fail('请输入有效金额');
    if (amount > 10000) return Toast.fail('单次充值上限10000积分');

    setRecharging(true);
    try {
      const order = await api.recharge({ amount, channel: rechargeChannel });
      const { orderNo, channel, payUrl, payMethod } = order;

      if (channel === 'mock' && payMethod !== 'auto') {
        await api.rechargeMockPay(orderNo);
      } else if (payUrl && payUrl.startsWith('mock://')) {
        await api.rechargeMockPay(orderNo);
      } else if (payUrl) {
        window.open(payUrl, '_blank');
      }

      const finalOrder = await pollOrderStatus(orderNo, channel);
      Toast.success(`充值成功，到账 ${finalOrder.amount} 积分`);
      navigate('/points/result?status=success');
      setShowRecharge(false);
      setRechargeAmount('');
      setRechargeChannel(channelsData?.defaultChannel || 'mock');
      const [balanceRes, logsRes] = await Promise.all([
        api.pointsBalance(),
        api.pointsLogs({ pageSize: 10 }),
      ]);
      setBalance(balanceRes);
      setLogs(logsRes.list || []);
    } catch (e) {
      // 渠道支付失败/超时 -> 跳转支付结果页
      const reason = e.message || '';
      if (reason.includes('失败')) {
        navigate(`/points/result?status=failed&message=${encodeURIComponent(reason)}`);
      } else if (reason.includes('超时') || reason.includes('未完成')) {
        navigate(`/points/result?status=expired&message=${encodeURIComponent(reason)}`);
      } else {
        Toast.fail(reason);
      }
    } finally {
      setRecharging(false);
    }
  };

  // 轮询订单状态：paid -> 成功；failed/expired -> 支付失败；超时未完成 -> 提示重新发起
  const pollOrderStatus = (orderNo, channel, times = 90, interval = 2000) =>
    new Promise((resolve, reject) => {
      let count = 0;
      let settled = false;
      const finish = (resolveFn, rejectFn, val) => {
        if (!settled) {
          settled = true;
          clearInterval(timer);
          resolveFn(val);
        }
      };
      const timer = setInterval(async () => {
        count += 1;
        try {
          const order = await api.rechargeOrderStatus(orderNo);
          if (order.status === 'paid') {
            finish(resolve, reject, order);
          } else if (order.status === 'failed' || order.status === 'expired') {
            finish(resolve, reject, new Error(order.status === 'failed' ? '支付失败，积分未到账' : '支付超时，订单已失效'));
          } else if (count >= times) {
            finish(resolve, reject, new Error('支付未完成，请重新发起充值'));
          }
        } catch (e) {
          if (count >= times) finish(resolve, reject, new Error('查询订单状态失败'));
        }
      }, interval);
    });

  if (loading) return <div className="page"><PageNavBar title="积分中心" onClickLeft={() => navigate(-1)} /><div className="empty-tip">加载中...</div></div>;

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
      <Grid columnNum={3} className="profile-grid">
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
        <div className="state-empty">
          <div className="state-empty__title">暂无流水记录</div>
        </div>
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
        <div className="dialog-body">
          {channelsData.channels.length > 1 && (
            <>
              <div className="dialog-body__label">支付方式：</div>
              <div className="recharge-chips">
                {channelsData.channels.map((ch) => (
                  <Button
                    key={ch}
                    size="small"
                    type={rechargeChannel === ch ? 'primary' : 'default'}
                    onClick={() => setRechargeChannel(ch)}
                  >
                    {{ mock: '模拟支付', wechat: '微信支付', alipay: '支付宝', stripe: 'Stripe', waffo: 'Waffo 支付' }[ch] || ch}
                  </Button>
                ))}
              </div>
            </>
          )}
          <div className="dialog-body__label">选择充值金额：</div>
          <div className="recharge-chips">
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
        </div>
      </Dialog>
    </div>
  );
}
