import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Toast, Button, Cell, CellGroup, Tag, Dialog, Field, Radio, Popup, DatetimePicker } from 'react-vant';
import { api } from '../api';
import PageNavBar from '../components/PageNavBar';
import { crmStatusLabel, formatDate, FOLLOW_UP_STATUS, followUpStatusLabel, stageLabel, timeAgo } from '../constants';

const statusLabelMap = {
  call_no_answer: '电话未接通',
  added_wechat: '已加微信',
  interested: '意向明确',
  quoting: '报价中',
  negotiating: '谈判中',
  closed: '已成交',
  abandoned: '已放弃',
};

export default function CRMDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({
    status: 'call_no_answer',
    contentPrivate: '',
    nextFollowDate: '',
  });
  const [showShare, setShowShare] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [shareForm, setShareForm] = useState({
    status: 'call_no_answer',
    summary: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchDetail = async () => {
    try {
      const res = await api.crmDetail(id);
      setDetail(res);
    } catch (e) {
      Toast.fail(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  useEffect(() => {
    if (window.location.hash === '#share') {
      setShowShare(true);
    }
  }, [id]);

  const handleAddFollowUp = async () => {
    if (!followUpForm.contentPrivate.trim()) return Toast.fail('请填写跟进内容');

    setSubmitting(true);
    try {
      await api.addFollowUp({
        crmOpportunityId: Number(id),
        status: followUpForm.status,
        contentPrivate: followUpForm.contentPrivate,
        nextFollowDate: followUpForm.nextFollowDate || undefined,
      });
      Toast.success('跟进记录已添加');
      setShowFollowUp(false);
      setFollowUpForm({ status: 'call_no_answer', contentPrivate: '', nextFollowDate: '' });
      fetchDetail();
    } catch (e) {
      Toast.fail(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (!shareForm.summary.trim()) return Toast.fail('请填写分享摘要');

    setSubmitting(true);
    try {
      await api.shareFollowUp({
        opportunityId: detail.opportunity_id,
        status: shareForm.status,
        summary: shareForm.summary,
      });
      Toast.success('分享成功');
      setShowShare(false);
      setShareForm({ status: 'call_no_answer', summary: '' });
    } catch (e) {
      Toast.fail(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="empty-tip">加载中...</div>;
  if (!detail) return <div className="empty-tip">CRM商机不存在</div>;

  return (
    <div className="page">
      <PageNavBar title="CRM详情" onClickLeft={() => navigate(-1)} />

      {/* 基本信息 */}
      <CellGroup inset>
        <Cell title="商机标题" value={detail.title || '手动录入'} />
        <Cell title="城市" value={detail.city || '未知'} />
        <Cell title="酒店" value={detail.hotel_name || '未知'} />
        <Cell title="分类" value={detail.category_name || '其他'} />
        <Cell title="状态" value={crmStatusLabel(detail.status)} />
        <Cell title="来源" value={detail.source === 'purchased' ? '购买入库' : '手动录入'} />
      </CellGroup>

      {/* 联系方式（购买后可见） */}
      {detail.source === 'purchased' && (
        <CellGroup inset style={{ marginTop: 12 }}>
          <Cell title="联系人" value={detail.contact_name || '未填写'} />
          <Cell title="电话" value={detail.contact_phone || '未填写'} isLink onClick={() => detail.contact_phone && (window.location.href = `tel:${detail.contact_phone}`)} />
          {detail.wechat && <Cell title="微信号" value={detail.wechat} />}
        </CellGroup>
      )}

      {/* 具体地址 */}
      {detail.address && (
        <div className="section">
          <div className="section-title">具体地址</div>
          <div style={{ padding: '8px 12px', color: '#666' }}>{detail.address}</div>
        </div>
      )}

      {/* 项目现状 */}
      {detail.stage && (
        <div className="section">
          <div className="section-title">项目现状</div>
          <div style={{ padding: '8px 12px', color: '#666' }}>{stageLabel(detail.stage)}</div>
        </div>
      )}

      {/* 项目概要 */}
      {detail.description_full && (
        <div className="section">
          <div className="section-title">项目概要</div>
          <div style={{ padding: '8px 12px', color: '#333', lineHeight: 1.6 }}>{detail.description_full}</div>
        </div>
      )}

      {/* 图纸附件 */}
      {detail.attachments && detail.attachments.length > 0 && (
        <div className="section">
          <div className="section-title">图纸附件</div>
          <div style={{ padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {detail.attachments.map((url, idx) => (
              <div key={idx} style={{ width: 80, height: 80, position: 'relative' }}>
                <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', textAlign: 'center', fontSize: 10, padding: '2px 0' }}>
                  附件{idx + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 市场情报（购买者可见） */}
      {detail.marketIntelligence && detail.marketIntelligence.totalShares > 0 && (
        <div className="section">
          <div className="section-title">市场情报</div>
          <div style={{ padding: '8px 12px', color: '#666', fontSize: 13 }}>
            基于 {detail.marketIntelligence.totalShares} 位购买者跟进
          </div>
          {detail.marketIntelligence.statusDistribution && Object.entries(detail.marketIntelligence.statusDistribution).map(([status, count]) => (
            <div key={status} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 12px', color: '#666' }}>
              <span>{statusLabelMap[status] || status}</span>
              <span>{count} 人</span>
            </div>
          ))}
          {detail.marketIntelligence.latestShares && detail.marketIntelligence.latestShares.length > 0 && (
            <div style={{ padding: '8px 12px' }}>
              <div style={{ color: '#999', fontSize: 12, marginBottom: 6 }}>最近摘要</div>
              {detail.marketIntelligence.latestShares.map((s, idx) => (
                <div key={idx} style={{ padding: '8px 0', borderTop: idx > 0 ? '1px solid #eee' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Tag size="mini">{statusLabelMap[s.status] || s.status}</Tag>
                    <span style={{ color: '#999', fontSize: 12 }}>{timeAgo(s.createdAt)}</span>
                  </div>
                  {s.summary && (
                    <div style={{ color: '#333', fontSize: 13, lineHeight: 1.5 }}>{s.summary}</div>
                  )}
                  <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>👍 {s.helpfulCount || 0} 人觉得有用</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 跟进记录 */}
      <div className="section">
        <div className="section-title">跟进记录</div>
        {detail.followUps && detail.followUps.length > 0 ? (
          detail.followUps.map((fu) => (
            <div key={fu.id} className="follow-up-item">
              <div className="follow-up-item__header">
                <Tag size="mini">{followUpStatusLabel(fu.status)}</Tag>
                <span>{formatDate(fu.created_at)}</span>
              </div>
              <div className="follow-up-item__content">{fu.content_private}</div>
              {fu.next_follow_date && (
                <div className="follow-up-item__remind">
                  下次跟进：{formatDate(fu.next_follow_date)}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="empty-tip">暂无跟进记录</div>
        )}
      </div>

      {/* 操作按钮 */}
      <div style={{ padding: '16px', display: 'flex', gap: 12 }}>
        <Button type="primary" block round onClick={() => setShowFollowUp(true)}>
          新增进跟
        </Button>
        <Button type="success" block round onClick={() => setShowShare(true)}>
          分享摘要
        </Button>
      </div>

      {/* 新增进跟弹窗 */}
      <Dialog
        visible={showFollowUp}
        title="新增跟进记录"
        showCancelButton
        onConfirm={handleAddFollowUp}
        onCancel={() => setShowFollowUp(false)}
      >
        <div style={{ padding: '16px 0' }}>
          <div style={{ marginBottom: 8 }}>跟进状态：</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {FOLLOW_UP_STATUS.map((s) => (
              <Button
                key={s.value}
                size="small"
                type={followUpForm.status === s.value ? 'primary' : 'default'}
                onClick={() => setFollowUpForm({ ...followUpForm, status: s.value })}
              >
                {s.label}
              </Button>
            ))}
          </div>
          <Field
            label="跟进内容"
            placeholder="记录本次跟进的详细内容"
            value={followUpForm.contentPrivate}
            onChange={(v) => setFollowUpForm({ ...followUpForm, contentPrivate: v })}
            type="textarea"
            rows={3}
          />
          <Field
            label="下次跟进日期"
            placeholder="请选择日期"
            value={followUpForm.nextFollowDate}
            isLink
            readOnly
            onClick={() => setShowDatePicker(true)}
          />
        </div>
      </Dialog>

      <Popup visible={showDatePicker} onClose={() => setShowDatePicker(false)} position="bottom" round>
        <DatetimePicker
          type="date"
          value={followUpForm.nextFollowDate ? new Date(followUpForm.nextFollowDate) : new Date()}
          minDate={new Date(2024, 0, 1)}
          maxDate={new Date(2030, 11, 31)}
          onCancel={() => setShowDatePicker(false)}
          onConfirm={(val) => {
            setFollowUpForm({ ...followUpForm, nextFollowDate: formatDate(val) });
            setShowDatePicker(false);
          }}
        />
      </Popup>

      {/* 分享摘要弹窗 */}
      <Dialog
        visible={showShare}
        title="分享摘要"
        showCancelButton
        onConfirm={handleShare}
        onCancel={() => setShowShare(false)}
      >
        <div style={{ padding: '16px 0' }}>
          <div style={{ marginBottom: 8 }}>选择进度状态：</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {FOLLOW_UP_STATUS.map((s) => (
              <Button
                key={s.value}
                size="small"
                type={shareForm.status === s.value ? 'primary' : 'default'}
                onClick={() => setShareForm({ ...shareForm, status: s.value })}
              >
                {s.label}
              </Button>
            ))}
          </div>
          <Field
            label="分享摘要"
            placeholder="一句话描述进度（匿名展示）"
            value={shareForm.summary}
            onChange={(v) => setShareForm({ ...shareForm, summary: v })}
          />
          <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
            您分享的摘要将匿名展示给其他购买者，帮助他们判断商机价值。
          </div>
          <div style={{ marginTop: 8, padding: 8, background: '#fff7e6', borderRadius: 4, color: '#d48806', fontSize: 12 }}>
            奖励规则：分享通过审核 +2 积分；摘要被标记有用 +1 积分
          </div>
        </div>
      </Dialog>
    </div>
  );
}
