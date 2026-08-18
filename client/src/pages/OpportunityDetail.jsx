import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tag, Toast, Button, Dialog, Field, CellGroup, Cell, Radio } from 'react-vant';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import PageNavBar from '../components/PageNavBar';
import { stageLabel, statusMeta, INVALID_REASONS, levelMeta, timeAgo } from '../constants';
import Icon from '../components/Icon';

export default function OpportunityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [showInvalidDialog, setShowInvalidDialog] = useState(false);
  const [invalidReason, setInvalidReason] = useState('');
  const [invalidReasonText, setInvalidReasonText] = useState('');

  useEffect(() => {
    api.opportunity(id)
      .then(setDetail)
      .catch((e) => Toast.fail(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePurchase = async () => {
    if (!user) return navigate('/login');

    const discount = levelMeta(user.level || 'normal').discount;
    const rateMap = { '无折扣': 1, '9折': 0.9, '8折': 0.8, '7折': 0.7 };
    const rate = rateMap[discount] || 1;
    const payable = Math.ceil(detail.price * rate);

    Dialog.confirm({
      title: '确认购买',
      message: (
        <div className="purchase-price-detail">
          <div className="purchase-price-detail__row"><span>原价</span><span>{detail.price} 积分</span></div>
          <div className="purchase-price-detail__row"><span>会员折扣（{levelMeta(user.level || 'normal').label}）</span><span>{discount}</span></div>
          <div className="purchase-price-detail__row purchase-price-detail__row--total"><span>实付</span><span>{payable} 积分</span></div>
        </div>
      ),
    }).then(async () => {
      setPurchasing(true);
      try {
        const res = await api.purchase({ opportunityId: Number(id) });
        const actual = res?.actualPrice;
        Toast.success(actual != null ? `购买成功，实付 ${actual} 积分` : '购买成功');
        const newDetail = await api.opportunity(id);
        setDetail(newDetail);
      } catch (e) {
        Toast.fail(e.message);
      } finally {
        setPurchasing(false);
      }
    }).catch(() => {});
  };

  const handleMarkInvalid = async () => {
    if (!invalidReason) return Toast.fail('请选择标记原因');

    try {
      await api.markInvalid(id, { reason: invalidReason, reasonText: invalidReasonText });
      Toast.success('标记成功');
      setShowInvalidDialog(false);
      const newDetail = await api.opportunity(id);
      setDetail(newDetail);
    } catch (e) {
      Toast.fail(e.message);
    }
  };

  if (loading) return <div className="empty-tip">加载中...</div>;
  if (!detail) return <div className="empty-tip">商机不存在</div>;

  const meta = statusMeta(detail.status);
  const canViewFull = detail.isPurchased || detail.isPublisher;
  const displayBrand = detail.brand || detail.hotelName || '未知品牌';

  const statusLabelMap = {
    call_no_answer: '电话未接通',
    added_wechat: '已加微信',
    interested: '意向明确',
    quoting: '报价中',
    negotiating: '谈判中',
    closed: '已成交',
    abandoned: '已放弃',
  };

  return (
    <div className="page">
      <PageNavBar title="商机详情" onClickLeft={() => navigate(-1)} />

      {/* 标题区域 */}
      <div className="detail-header">
        <div className="detail-header__top">
          <Tag color={meta.color} bg={meta.bg}>{meta.label}</Tag>
          <Tag type="primary">{detail.categoryName}</Tag>
        </div>
        <h2 className="detail-header__title">{detail.title}</h2>
        <div className="detail-header__meta">
          <span><Icon name="location-o" size={14} /> {detail.city || '未知城市'}</span>
          <span><Icon name="hotel-o" size={14} /> {displayBrand}</span>
        </div>
      </div>
      {/* 价格区 */}
      <div className="detail-price">
        <div className="detail-price__amount">{detail.price} <span>积分</span></div>
        <div className="detail-price__info">
          <span>{detail.purchaseCount || 0} 人已购买</span>
          <span>{detail.viewCount || 0} 次浏览</span>
        </div>
      </div>

      {/* 标签 */}
      {detail.tags && detail.tags.length > 0 && (
        <div className="detail-tags">
          {detail.tags.map((t) => (
            <Tag key={t.id} type="primary" plain style={{ margin: '0 4px 4px 0' }}>{t.name}</Tag>
          ))}
        </div>
      )}

      {/* 已购买标识 - 右上角 */}
      {detail.isPurchased && (
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <Tag type="success" plain>已购买</Tag>
        </div>
      )}

      {/* 购买后才显示的内容 */}
      {canViewFull ? (
        <>
          {/* 具体地址 */}
          {detail.address && (
            <div className="detail-section">
              <div className="detail-section__title">具体地址</div>
              <div className="detail-section__content" style={{ color: '#666' }}>
                {detail.address}
              </div>
            </div>
          )}

          {/* 项目现状 */}
          {detail.stage && (
            <div className="detail-section">
              <div className="detail-section__title">项目现状</div>
              <div className="detail-section__content" style={{ color: '#666' }}>
                {stageLabel(detail.stage)}
              </div>
            </div>
          )}

          {/* 联系方式 */}
          <div className="detail-section">
            <div className="detail-section__title">联系方式</div>
            <CellGroup>
              <Cell title="联系人" value={detail.contactName || '未填写'} />
              <Cell title="电话" value={detail.contactPhone || '未填写'} isLink onClick={() => detail.contactPhone && (window.location.href = `tel:${detail.contactPhone}`)} />
              {detail.wechat && <Cell title="微信号" value={detail.wechat} />}
            </CellGroup>
          </div>

          {/* 图纸附件 */}
          {detail.attachments && detail.attachments.length > 0 && (
            <div className="detail-section">
              <div className="detail-section__title">图纸附件</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
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

          {/* 项目概要（购买后可见） */}
          {detail.descriptionFull && (
            <div className="detail-section">
              <div className="detail-section__title">项目概要</div>
              <div className="detail-section__content" style={{ lineHeight: 1.6, color: '#333' }}>
                {detail.descriptionFull}
              </div>
            </div>
          )}
        </>
      ) : (
        /* 未购买时的锁定提示 */
        <div className="detail-section detail-lock" style={{ textAlign: 'center', padding: '40px 0' }}>
          <Icon name="lock" size={48} color="#969799" />
          <div style={{ marginTop: 16, fontSize: 14, color: '#666' }}>购买后查看具体地址、联系人、项目现状、项目概要及图纸附件</div>
        </div>
      )}

      {/* 市场情报（若存在，仅购买同一条商机的人可见） */}
      {canViewFull && detail.marketIntelligence && detail.marketIntelligence.totalShares > 0 && (
        <div className="detail-section">
          <div className="detail-section__title">市场情报</div>
          <div className="detail-intelligence">
            <div className="detail-intelligence__summary">
              基于 {detail.marketIntelligence.totalShares} 位购买者跟进
            </div>
            {detail.marketIntelligence.statusDistribution && Object.entries(detail.marketIntelligence.statusDistribution).map(([status, count]) => (
              <div key={status} className="detail-intelligence__item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>{statusLabelMap[status] || status}</span>
                <span>{count} 人</span>
              </div>
            ))}
            {detail.marketIntelligence.latestShares && detail.marketIntelligence.latestShares.length > 0 && (
              <div className="detail-intelligence__shares">
                <div className="detail-intelligence__shares-title" style={{ marginTop: 12, marginBottom: 8, color: '#666', fontSize: 13 }}>
                  最近摘要
                </div>
                {detail.marketIntelligence.latestShares.map((s, idx) => (
                  <div key={idx} className="detail-intelligence__share-item" style={{ padding: '8px 0', borderTop: idx > 0 ? '1px solid #eee' : 'none' }}>
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
        </div>
      )}

      {/* 投稿人 */}
      <div className="detail-section">
        <div className="detail-section__title">投稿人</div>
        <div className="detail-publisher">
          <div className="detail-publisher__avatar">{detail.publisherName?.[0] || '匿'}</div>
          <div className="detail-publisher__info">
            <div className="detail-publisher__name">{detail.publisherName || '匿名用户'}</div>
            {detail.publisherCompany && <div className="detail-publisher__company">{detail.publisherCompany}</div>}
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="detail-footer">
        {!canViewFull && detail.status === 'active' && (
          <Button type="primary" block round loading={purchasing} onClick={handlePurchase}>
            花费 {detail.price} 积分解锁
          </Button>
        )}
        {canViewFull && (
          <Button type="success" block round onClick={() => navigate('/crm')}>
            {detail.isPublisher ? '查看跟进分布' : '进入CRM管理'}
          </Button>
        )}
        {detail.isPurchased && detail.crmId && (
          <Button plain block round style={{ marginTop: 8 }} onClick={() => navigate(`/crm/${detail.crmId}#share`)}>
            分享跟进
          </Button>
        )}
        {detail.isPurchased && (
          <Button plain block round style={{ marginTop: 8 }} onClick={() => setShowInvalidDialog(true)}>
            标记无效
          </Button>
        )}
      </div>

      {/* 无效标记弹窗 */}
      <Dialog
        visible={showInvalidDialog}
        title="标记无效"
        showCancelButton
        onConfirm={handleMarkInvalid}
        onCancel={() => setShowInvalidDialog(false)}
      >
        <div style={{ padding: '16px 0' }}>
          <div style={{ marginBottom: 8 }}>请选择标记原因：</div>
          {INVALID_REASONS.map((r) => (
            <Radio key={r.value} checked={invalidReason === r.value} onChange={() => setInvalidReason(r.value)} style={{ display: 'block', margin: '8px 0' }}>
              {r.label}
            </Radio>
          ))}
          <Field
            label="补充说明"
            placeholder="可选填写"
            value={invalidReasonText}
            onChange={setInvalidReasonText}
            type="textarea"
            rows={2}
          />
        </div>
      </Dialog>
    </div>
  );
}
