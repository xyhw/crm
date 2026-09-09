import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, Cell, CellGroup, Tag, ActionSheet, Dialog } from 'react-vant';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { levelMeta, categoryLabel } from '../constants';

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const [showAgreements, setShowAgreements] = useState(false);

  useEffect(() => {
    refreshUser().catch(() => {});
  }, []);

  const level = levelMeta(user?.level || 'normal');

  const handleLogout = () => {
    Dialog.confirm({
      title: '退出登录',
      message: '确认退出当前账号？',
    }).then(() => {
      logout();
      navigate('/login');
    }).catch(() => {});
  };

  return (
    <div className="page">
      <NavBar title="个人中心" safeAreaInsetTop />

      {/* 用户信息卡片 */}
      <div className="profile-card">
        <div className="profile-card__avatar">{user?.nickname?.[0] || '友'}</div>
        <div className="profile-card__info">
          <div className="profile-card__name">{user?.nickname || '未登录'}</div>
          <Tag className="profile-card__level-tag">{level.label}</Tag>
        </div>
        <div className="profile-card__credit">
          信用分：
          <span className="profile-card__credit-val">
            {user?.creditScore || 100}
          </span>
        </div>
      </div>

      {/* 联系/身份信息 + 积分入口 */}
      <div className="profile-meta profile-meta--gap">
        {user?.company && (
          <div className="profile-meta__item"><span>公司</span>{user.company}</div>
        )}
        {user?.category != null && (
          <div className="profile-meta__item"><span>类型</span>{categoryLabel(user.category)}</div>
        )}
        {user?.email && (
          <div className="profile-meta__item"><span>邮箱</span>{user.email}</div>
        )}
        <div className="profile-meta__item profile-meta__item--link pressable" onClick={() => navigate('/points')}>
          <span>我的积分</span>
          <span className="profile-points__num">
            {user?.pointsBalance ?? 0}
            <Icon name="arrow" size={12} color="var(--text-color-3)" />
          </span>
        </div>
      </div>

      {/* 资质展示 */}
      {user?.qualifications && (
        <div className="section">
          <div className="section-title">专业资质</div>
          <div className="qualification-list">
            {user.qualifications.split('\n').filter(Boolean).map((q, i) => (
              <div key={i} className="qualification-item">
                <Icon name="certificate" size={16} color="var(--primary-color)" />
                <span>{q}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 案例展示 */}
      {user?.cases && (
        <div className="section">
          <div className="section-title">典型案例</div>
          <div className="case-list">
            {user.cases.split('\n').filter(Boolean).map((c, i) => (
              <div key={i} className="case-card">
                <div className="case-card__desc">{c}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 功能列表 */}
      <CellGroup inset>
        <Cell title="积分中心" isLink onClick={() => navigate('/points')} icon={<Icon name="gold-coin-o" size={18} />} />
        <Cell title="我发布的商机" isLink onClick={() => navigate('/my-opportunities')} icon={<Icon name="notes-o" size={18} />} />
        <Cell title="会员等级" isLink onClick={() => navigate('/member-level')} icon={<Icon name="award-o" size={18} />} />
        <Cell title="信用分" isLink onClick={() => navigate('/credit')} icon={<Icon name="shield-o" size={18} />} />
        <Cell title="邀请好友" isLink onClick={() => navigate('/invite')} icon={<Icon name="friends-o" size={18} />} />
        <Cell title="排行榜" isLink onClick={() => navigate('/ranking')} icon={<Icon name="medal-o" size={18} />} />
        <Cell title="通知中心" isLink onClick={() => navigate('/notifications')} icon={<Icon name="bell" size={18} />} />
        <Cell title="提醒中心" isLink onClick={() => navigate('/reminders')} icon={<Icon name="alarm-o" size={18} />} />
      </CellGroup>

      {/* 设置 */}
      <CellGroup inset className="profile-section--gap">
        <Cell title="编辑资料" isLink onClick={() => navigate('/profile/edit')} icon={<Icon name="edit" size={18} />} />
        <Cell title="账号安全" isLink onClick={() => navigate('/profile/change-password')} icon={<Icon name="lock" size={18} />} />
        <Cell title="客服与帮助" isLink onClick={() => navigate('/support')} icon={<Icon name="service-o" size={18} />} />
        <Cell title="用户协议与隐私" isLink onClick={() => setShowAgreements(true)} icon={<Icon name="notes-o" size={18} />} />
        <Cell title="退出登录" onClick={handleLogout} icon={<Icon name="close" size={18} />} />
      </CellGroup>

      <div className="profile-footer-space" />

      <ActionSheet
        visible={showAgreements}
        actions={[
          { name: '用户协议', key: 'agreement' },
          { name: '隐私政策', key: 'privacy' },
          { name: '平台须知', key: 'summary' },
        ]}
        onSelect={(action) => {
          setShowAgreements(false);
          navigate(`/agreement/${action.key}`);
        }}
        onCancel={() => setShowAgreements(false)}
      />
    </div>
  );
}
