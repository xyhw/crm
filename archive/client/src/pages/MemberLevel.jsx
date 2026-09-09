import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast, Progress, Cell, CellGroup, Tag } from 'react-vant';
import { api } from '../api';
import PageNavBar from '../components/PageNavBar';
import { LEVEL_META } from '../constants';

export default function MemberLevel() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.myStats()
      .then(setStats)
      .catch((e) => Toast.fail(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><PageNavBar title="会员等级" onClickLeft={() => navigate(-1)} /><div className="empty-tip">加载中...</div></div>;

  const level = stats?.level || {};
  const currentLevel = LEVEL_META[level.level] || LEVEL_META.normal;

  const levels = [
    { key: 'normal', ...LEVEL_META.normal, threshold: '注册即获得' },
    { key: 'silver', ...LEVEL_META.silver, threshold: '投稿购买率≥30%，无效率≤10%' },
    { key: 'gold', ...LEVEL_META.gold, threshold: '投稿购买率≥50%，无效率≤5%' },
    { key: 'expert', ...LEVEL_META.expert, threshold: '投稿购买率≥70%，无效率≤3%' },
  ];

  const currentIndex = levels.findIndex((l) => l.key === level.level);

  return (
    <div className="page">
      <PageNavBar title="会员等级" onClickLeft={() => navigate(-1)} />

      {/* 当前等级 */}
      <div className="level-card" style={{ background: currentLevel.color }}>
        <div className="level-card__name">{currentLevel.label}</div>
        <div className="level-card__discount">{currentLevel.discount}</div>
      </div>

      {/* 维度进度 */}
      <CellGroup inset className="profile-section--gap">
        <Cell title="投稿购买率" value={`${level.purchase_rate || 0}%`} />
        <Cell title="投稿无效率" value={`${level.invalid_rate || 0}%`} />
        <Cell title="共享有用率" value={`${level.helpful_rate || 0}%`} />
        <Cell title="活跃度得分" value={level.activity_score || 0} />
        <Cell title="综合得分" value={level.composite_score || 0} />
      </CellGroup>

      {/* 等级说明 */}
      <div className="section">
        <div className="section-title">等级说明</div>
        {levels.map((l, i) => (
          <div key={l.key} className={`level-item ${i <= currentIndex ? 'level-item--active' : 'level-item--locked'}`}>
            <div className="level-item__header">
              <Tag color={l.color}>{l.label}</Tag>
              <span>{l.discount}</span>
            </div>
            <div className="level-item__desc">晋升条件：{l.threshold}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
