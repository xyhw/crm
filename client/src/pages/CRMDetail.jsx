import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NavBar, Toast, Button, Cell, CellGroup, Tag, Dialog, Field, Radio } from 'react-vant';
import { api } from '../api';
import { followUpStatusLabel, formatDate, FOLLOW_UP_STATUS } from '../constants';
import { ArrowLeft } from '@react-vant/icons';

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
    if (!shareForm.summary.trim()) return Toast.fail('请填写共享摘要');

    setSubmitting(true);
    try {
      await api.shareFollowUp({
        opportunityId: detail.opportunity_id,
        status: shareForm.status,
        summary: shareForm.summary,
      });
      Toast.success('共享成功');
      setShowShare(false);
      setShareForm({ status: 'call_no_answer', summary: '' });
    } catch (e) {
      Toast.fail(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="empty-tip">加载中...</div>;
  if (!detail) return <div className="empty-tip">CRM跟单不存在</div>;

  return (
    <div className="page">
      <NavBar title="CRM详情" leftArrow={<ArrowLeft width={20} height={20} />} onClickLeft={() => navigate(-1)} safeAreaInsetTop />

      {/* 基本信息 */}
      <CellGroup inset>
        <Cell title="跟单标题" value={detail.title || '手动录入'} />
        <Cell title="城市" value={detail.city || '未知'} />
        <Cell title="酒店" value={detail.hotel_name || '未知'} />
        <Cell title="分类" value={detail.category_name || '其他'} />
        <Cell title="状态" value={followUpStatusLabel(detail.status)} />
        <Cell title="来源" value={detail.source === 'purchased' ? '购买入库' : '手动录入'} />
      </CellGroup>

      {/* 联系方式（购买后可见） */}
      {detail.source === 'purchased' && (
        <CellGroup inset style={{ marginTop: 12 }}>
          <Cell title="联系人" value={detail.contact_name || '未填写'} />
          <Cell title="电话" value={detail.contact_phone || '未填写'} isLink onClick={() => detail.contact_phone && (window.location.href = `tel:${detail.contact_phone}`)} />
        </CellGroup>
      )}

      {/* 跟进记录 */}
      <div className="section" style={{ padding: '12px 16px' }}>
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
          共享进度
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
            placeholder="YYYY-MM-DD"
            value={followUpForm.nextFollowDate}
            onChange={(v) => setFollowUpForm({ ...followUpForm, nextFollowDate: v })}
          />
        </div>
      </Dialog>

      {/* 共享进度弹窗 */}
      <Dialog
        visible={showShare}
        title="共享进度"
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
            label="共享摘要"
            placeholder="一句话描述进度（匿名展示）"
            value={shareForm.summary}
            onChange={(v) => setShareForm({ ...shareForm, summary: v })}
          />
          <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
            您的共享摘要将匿名展示给其他购买者，帮助他们判断跟单价值。
          </div>
        </div>
      </Dialog>
    </div>
  );
}
