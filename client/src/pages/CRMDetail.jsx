import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Toast, Button, Cell, CellGroup, Tag, Dialog, Field, Radio, Popup, DatetimePicker, Tabs } from 'react-vant';
import { api } from '../api';
import PageNavBar from '../components/PageNavBar';
import MarketIntelligence from '../components/MarketIntelligence';
import AttachmentGrid from '../components/AttachmentGrid';
import Pagination from '../components/Pagination';
import { crmStatusLabel, formatDate, FOLLOW_UP_STATUS, followUpStatusLabel, stageLabel } from '../constants';

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
  const [activeTab, setActiveTab] = useState('progress');
  const [followUpPage, setFollowUpPage] = useState(1);
  const followUpPageSize = 6;

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
      setActiveTab('progress');
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
      setActiveTab('follow');
      setFollowUpPage(1);
      fetchDetail();
    } catch (e) {
      Toast.fail(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (!shareForm.summary.trim()) return Toast.fail('请填写进度情报');

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
      fetchDetail();
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
        <CellGroup inset className="profile-section--gap">
          <Cell title="联系人" value={detail.contact_name || '未填写'} />
          <Cell title="电话" value={detail.contact_phone || '未填写'} isLink onClick={() => detail.contact_phone && (window.location.href = `tel:${detail.contact_phone}`)} />
          {detail.wechat && <Cell title="微信号" value={detail.wechat} />}
        </CellGroup>
      )}

      {/* 具体地址 */}
      {detail.address && (
        <div className="section section--inset">
          <div className="section-title">具体地址</div>
          <div className="section-text">{detail.address}</div>
        </div>
      )}

      {/* 项目现状 */}
      {detail.stage && (
        <div className="section section--inset">
          <div className="section-title">项目现状</div>
          <div className="section-text">{stageLabel(detail.stage)}</div>
        </div>
      )}

      {/* 项目概要 */}
      {detail.description_full && (
        <div className="section section--inset">
          <div className="section-title">项目概要</div>
          <div className="section-text section-text--rich">{detail.description_full}</div>
        </div>
      )}

      {/* 图纸附件 */}
      {detail.attachments && detail.attachments.length > 0 && (
        <div className="section section--inset">
          <div className="section-title">图纸附件</div>
          <div className="section-attach">
            <AttachmentGrid files={detail.attachments} />
          </div>
        </div>
      )}

      {/* 共享进度 / 跟进记录 Tab */}
      <div className="section section--inset">
        <Tabs active={activeTab} onChange={setActiveTab} lazyRender={false}>
          <Tabs.TabPane title="共享进度">
            {detail.marketIntelligence && detail.marketIntelligence.totalShares > 0 ? (
              <MarketIntelligence intelligence={detail.marketIntelligence} onLiked={fetchDetail} />
            ) : (
              <div className="empty-tip">暂无人共享进度</div>
            )}
          </Tabs.TabPane>
          <Tabs.TabPane title="跟进记录">
            {(function() {
              const fups = detail.followUps || [];
              if (fups.length === 0) return <div className="empty-tip">暂无跟进记录</div>;
              const fupTotalPages = Math.ceil(fups.length / followUpPageSize);
              const visibleFups = fups.slice((followUpPage - 1) * followUpPageSize, followUpPage * followUpPageSize);
              return (
                <>
                  {visibleFups.map((fu) => (
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
                  ))}
                  {fupTotalPages > 1 && (
                    <Pagination page={followUpPage} totalPages={fupTotalPages} onChange={setFollowUpPage} />
                  )}
                </>
              );
            })()}
          </Tabs.TabPane>
        </Tabs>
      </div>

      {/* 操作按钮 */}
      <div className="detail-footer detail-footer--row">
        <Button type="primary" block round onClick={() => setShowFollowUp(true)}>
          新增跟进
        </Button>
        <Button type="success" block round onClick={() => setShowShare(true)}>
          共享进度
        </Button>
      </div>

      {/* 新增跟进弹窗 */}
      <Dialog
        visible={showFollowUp}
        title="新增跟进记录"
        showCancelButton
        onConfirm={handleAddFollowUp}
        onCancel={() => setShowFollowUp(false)}
      >
        <div className="dialog-body">
          <div className="dialog-body__label">跟进状态：</div>
          <div className="status-chips">
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

      {/* 共享进度弹窗 */}
      <Dialog
        visible={showShare}
        title="共享进度"
        showCancelButton
        onConfirm={handleShare}
        onCancel={() => setShowShare(false)}
      >
        <div className="dialog-body">
          <div className="dialog-body__label">选择进度状态：</div>
          <div className="status-chips">
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
            label="共享内容"
            placeholder="一句话描述进度（匿名展示）"
            value={shareForm.summary}
            onChange={(v) => setShareForm({ ...shareForm, summary: v })}
          />
          <div className="dialog-tip">
            您共享的进度将匿名展示在共享进度榜，帮助其他购买者判断商机价值。
          </div>
          <div className="dialog-reward">
            奖励规则：共享通过审核 +2 积分；情报被点赞 +1 积分
          </div>
        </div>
      </Dialog>
    </div>
  );
}
