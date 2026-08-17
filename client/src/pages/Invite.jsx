import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast, Button, Cell, CellGroup, Empty, Tabs } from 'react-vant';
import { api } from '../api';
import { timeAgo } from '../constants';
import InvitePoster from '../components/InvitePoster';
import { GiftO } from '@react-vant/icons';
import PageNavBar from '../components/PageNavBar';

export default function Invite() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('code');

  useEffect(() => {
    api.invitationMe()
      .then(setData)
      .catch((e) => Toast.fail(e.message))
      .finally(() => setLoading(false));
    api.me()
      .then((me) => setNickname(me?.nickname || '酒店商机伙伴'))
      .catch(() => {});
  }, []);

  const handleCopy = () => {
    if (data?.inviteCode) {
      navigator.clipboard.writeText(data.inviteCode)
        .then(() => Toast.success('邀请码已复制'))
        .catch(() => Toast.fail('复制失败'));
    }
  };

  if (loading) return <div className="empty-tip">加载中...</div>;

  return (
    <div className="page">
      <PageNavBar title="邀请好友" onClickLeft={() => navigate(-1)} />

      {/* 邀请码 */}
      <div className="invite-card">
        <div className="invite-card__label">我的邀请码</div>
        <div className="invite-card__code">{data?.inviteCode || '暂无'}</div>
        <Button type="primary" round onClick={handleCopy}>复制邀请码</Button>
      </div>

      {/* 海报 */}
      <div className="section">
        <div className="section-title">邀请海报</div>
        <Tabs value={tab} onChange={setTab}>
          <Tabs.TabPane title="邀请码" name="code" />
          <Tabs.TabPane title="海报" name="poster" />
        </Tabs>
        {tab === 'poster' && <InvitePoster inviteCode={data?.inviteCode} nickname={nickname} />}
      </div>

      {/* 邀请奖励说明 */}
      <CellGroup inset style={{ marginTop: 12 }}>
        <Cell title="邀请奖励" label="邀请人和被邀请人各得5积分" icon={<GiftO width={20} height={20} />} />
        <Cell title="已邀请人数" value={data?.stats?.totalInvited || 0} />
        <Cell title="累计奖励" value={`${data?.stats?.totalReward || 0} 积分`} />
      </CellGroup>

      {/* 邀请记录 */}
      <div className="section">
        <div className="section-title">邀请记录</div>
        {data?.records?.length > 0 ? (
          data.records.map((record) => (
            <div key={record.id} className="invite-record">
              <div className="invite-record__user">{record.invitee_nickname || '新用户'}</div>
              <div className="invite-record__time">{timeAgo(record.created_at)}</div>
              <div className="invite-record__reward">+{record.inviter_reward} 积分</div>
            </div>
          ))
        ) : (
          <Empty description="暂无邀请记录" />
        )}
      </div>
    </div>
  );
}
