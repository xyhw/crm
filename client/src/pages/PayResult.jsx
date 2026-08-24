import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from 'react-vant';
import { StopCircleO, ClockO, Passed } from '@react-vant/icons';
import PageNavBar from '../components/PageNavBar';

export default function PayResult() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const status = params.get('status') || 'success';
  const message = params.get('message') || '';

  const meta = {
    success: { title: '充值成功', desc: '积分已到账，请查收', icon: <Passed width={64} height={64} color="#07c160" /> },
    failed: { title: '支付失败', desc: message || '您的这笔支付未能完成，积分未到账，可重新发起充值', icon: <StopCircleO width={64} height={64} color="#ee0a24" /> },
    expired: { title: '支付超时', desc: message || '订单已超时失效，请在有效期(30分钟)内完成支付', icon: <ClockO width={64} height={64} color="#ff976a" /> },
  }[status] || meta.expired;

  return (
    <div className="page">
      <PageNavBar title={meta.title === '充值成功' ? '支付结果' : '支付结果'} onClickLeft={() => navigate('/points')} />

      <div className="pay-result">
        <div className="pay-result__icon">{meta.icon}</div>
        <div className="pay-result__title">{meta.title}</div>
        <div className="pay-result__desc">{meta.desc}</div>

        <div className="pay-result__actions">
          <Button block type={status === 'success' ? 'primary' : 'danger'} round onClick={() => navigate(status === 'success' ? '/points' : '/points', { state: { reopenRecharge: true } })}>
            {status === 'success' ? '回到积分中心' : '重新充值'}
          </Button>
        </div>
      </div>
    </div>
  );
}