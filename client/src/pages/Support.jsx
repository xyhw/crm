import { useNavigate } from 'react-router-dom';
import { NavBar, CellGroup, Cell } from 'react-vant';

export default function Support() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <NavBar title="客服与帮助" leftArrow onClickLeft={() => navigate(-1)} safeAreaInsetTop />
      <CellGroup inset style={{ marginTop: 16 }}>
        <Cell title="客服热线" value="400-123-4567" isLink onClick={() => window.location.href = 'tel:400-123-4567'} />
        <Cell title="客服邮箱" value="support@hotel-order.com" />
      </CellGroup>
      <div style={{ padding: 16 }}>
        <div style={{ color: '#666', fontSize: 13 }}>
          <p>工作时间：周一至周日 9:00-21:00</p>
          <p>常见问题：</p>
          <p>1. 积分充值后立即到账，可在积分流水页面查看</p>
          <p>2. 购买跟单后自动加入CRM，可在CRM页面跟进</p>
          <p>3. 如果发现跟单信息有误，可在跟单详情页点击"无效反馈"</p>
          <p>4. 邀请好友加入可获得积分奖励，邀请海报在"邀请"页面查看</p>
          <p>5. 如需更多帮助，请联系客服热线或发送邮件</p>
        </div>
      </div>
    </div>
  );
}