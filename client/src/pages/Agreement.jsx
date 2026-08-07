import { useNavigate, useParams } from 'react-router-dom';
import { NavBar } from 'react-vant';
import { ArrowLeft } from '@react-vant/icons';

const AGREEMENTS = {
  agreement: {
    title: '用户�协议',
    sections: [
      { h: '一、服务说明', p: '欢迎使用酒店供应�链�跟单互助平台。本平台为用户提供酒店�跟单信息发布、�购�买、分享及分�佣服务。使用本平台即表示您已�阅读并同意本�协议。' },
      { h: '二、�账号管理', p: '您应�妥善保管�账号及密码，对以您�账号进行的全部操作负责。注册信息须真实有效，不得�冒用他人身份。' },
      { h: '三、信息发布规范', p: '发布�跟单信息须真实、合法，不得发布�虚假、�侵权或�违反法律法规的内容。平台有权对�违规信息进行下架处理。' },
      { h: '四、�积分与交易', p: '�积分是本平台的�虚�拟交易�凭证，可通过充值、�邀请奖�励、分�佣等途径获得。�购�买�跟单后�积分即时�扣除，退款按平台规则处理。' },
      { h: '五、信用分管理', p: '平台根据用户行为动态调整信用分。信用分过低时将限制投�稿、�购�买等功能，严重�违规将封禁�账号。' },
      { h: '六、分�佣规则', p: '�跟单信息被�购�买后，发布者可获得�订单分�佣。分�佣比例根据会员等级确定，平台保留调整规则的权力并会提前公示。' },
      { h: '七、免责声明', p: '平台信息由用户自行发布，交易风险由双方自行承担。因不可抗力或第三方原因导致的服务中断，平台不承担责任。' },
      { h: '八、�协议变更', p: '平台可随时更新本�协议，变更后将在站内公示。继续使用服务即视为接受更新后的�协议。' },
    ],
  },
  privacy: {
    title: '�隐私政策',
    sections: [
      { h: '一、信息收集', p: '我们仅收集提供服务所必需的信息，包括手机号、�昵称等注册信息，以及您主动发布的内容。' },
      { h: '二、信息使用', p: '您的信息仅用于�账号认证、�订单交易、通知提�醒等服务目的，不会用于与服务无关的用途。' },
      { h: '三、信息保�护', p: '我们采取加密存�储、�访问控制等安全�措施保�护您的个人信息，防止未经授权的�访问与�泄�露。' },
      { h: '四、信息共享', p: '未经您的同意，我们不会向第三方共享您的个人信息，法律法规另有规定的除外。' },
      { h: '五、您的权利', p: '您可以随时查�阅、更正您的个人信息，也可以联系我们注�销�账号，注�销后我们将删除相关数据。' },
      { h: '六、政策更新', p: '本政策可能�适时更新，重大变更将通过站内通知等方式告知。' },
      { h: '七、联系我们', p: '如对本政策有任何疑问，可通过平台内的联系方式与我们取得联系。' },
    ],
  },
  summary: {
    title: '平台须知',
    sections: [
      { h: '�账号安全', p: '请�妥善保管手机号及密码，不对他人透�露验证码，�避免�账号被盗。' },
      { h: '信息真实性', p: '发布的�跟单信息须真实合法，不得�虚假�夸大或误导他人。平台有权下架�违规信息并�扣除信用分。' },
      { h: '交易风险', p: '�跟单交易�涉及商业谈判，平台仅提供信息�撮合，成果及风险由交易双方自行承担。' },
      { h: '�积分使用', p: '�积分为平台�虚�拟货币，可用于�购�买�跟单，�购�买后不可退还，仅在�协议�允许情况下可申请退款。' },
      { h: '信用分影响', p: '信用分根据交易行为动态调整，过低将限制发布、�购�买等功能，严重�违规将封禁�账号。' },
      { h: '分�佣规则', p: '发布者可获得分�佣，比例根据会员等级，平台保留调整权力并会提前公示。' },
      { h: '禁止行为', p: '禁止发布�虚假信息、恶意差评、�刷单等行为，一经查实将依据严�肃性处理。' },
    ],
  },
};

export default function Agreement() {
  const navigate = useNavigate();
  const { type = 'agreement' } = useParams();
  const doc = AGREEMENTS[type] || AGREEMENTS.agreement;

  return (
    <div className="page">
      <NavBar title={doc.title} leftArrow={<ArrowLeft width={20} height={20} />} onClickLeft={() => navigate(-1)} safeAreaInsetTop />
      <div className="agreement">
        <h2 className="agreement__intro">欢迎使用酒店供应链跟单互助平台，请仔细阅读以下条款。</h2>
        {doc.sections.map((s) => (
          <div key={s.h}>
            <h3 className="agreement__h">{s.h}</h3>
            <p className="agreement__p">{s.p}</p>
          </div>
        ))}
        <p className="agreement__footer">最后更新：2026-08-05</p>
      {/* � 底部�链接导�航 */}
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 16, fontSize: 13, color: '#1677ff' }}>
        <span onClick={() => navigate('/agreement/agreement')}>用户�协议</span>
        <span onClick={() => navigate('/agreement/privacy')}>�隐私政策</span>
        <span onClick={() => navigate('/agreement/summary')}>平台须知</span>
      </div>
    </div>
  );
}
