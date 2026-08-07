import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NavBar, Tag, Toast, Button, Dialog, Field, CellGroup, Cell, Radio } from 'react-vant';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { categoryLabel, stageLabel, statusMeta, timeAgo, INVALID_REASONS } from '../constants';
import { ArrowLeft } from '@react-vant/icons';

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
    
    Dialog.confirm({
      title: '确认�购�买',
      message: `确定花费 ${detail.price} �积分解�锁此�跟单？`,
    }).then(async () => {
      setPurchasing(true);
      try {
        await api.purchase({ opportunityId: Number(id) });
        Toast.success('�购�买成功');
        // 重新加载�详情
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
      // 重新加载
      const newDetail = await api.opportunity(id);
      setDetail(newDetail);
    } catch (e) {
      Toast.fail(e.message);
    }
  };

  if (loading) return <div className="empty-tip">加载中...</div>;
  if (!detail) return <div className="empty-tip">�跟单不存在</div>;

  const meta = statusMeta(detail.status);
  const canViewFull = detail.isPurchased || detail.isPublisher;

  // Determine brand/hotel display
  const displayBrand = detail.brand || detail.hotelName || '未知品牌';

  return (
    <div className="page">
      <NavBar title="�跟单�详情" leftArrow={<ArrowLeft width={20} height={20} />} onClickLeft={() => navigate(-1)} safeAreaInsetTop />

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
          {detail.stage && <span><Icon name="clock-o" size={14} /> {stageLabel(detail.stage)}</span>}
        </div>
      </div>

      {/* 价格区 */}
      <div className="detail-price">
        <div className="detail-price__amount">{detail.price} <span>�积分</span></div>
        <div className="detail-price__info">
          <span>{detail.purchaseCount || 0} 人已�购�买</span>
          <span>{detail.viewCount || 0} � 次�浏�览</span>
        </div>
      </div>

      {/* 项目简介 - � 始终展示（公开�描述） */}
      <div className="detail-section">
        <div className="detail-section__title">项目简介</div>
        <div className="detail-section__content" style={{ lineHeight: 1.6, color: '#333' }}>
          {detail.descriptionPublic || '�暂无简介'}
        </div>
      </div>

      {/* 项目进展 - � 始终展示 */}
      {detail.stage && (
        <div className="detail-section">
          <div className="detail-section__title">项目进展</div>
          <div className="detail-section__content" style={{ color: '#666' }}>
            {stageLabel(detail.stage)}
          </div>
        </div>
      )}

      {/* � 已�购�买标识 - 右上角或底部 */}
      {detail.isPurchased && (
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <Tag type="success" plain>已�购�买</Tag>
        </div>
      )}

      {/* �� 购�买后才显示的内容 */}
      {canViewFull ? (
        <>
          {/* � 联系方式 */}
          <div className="detail-section">
            <div className="detail-section__title">联系方式</div>
            <CellGroup>
              <Cell title="联系人" value={detail.contactName || '未�填写'} />
              <Cell title="电话" value={detail.contactPhone || '未�填写'} isLink onClick={() => detail.contactPhone && (window.location.href = `tel:${detail.contactPhone}`)} />
            </CellGroup>
          </div>

          {/* 图�纸附件 */}
          {detail.attachments && detail.attachments.length > 0 && (
            <div className="detail-section">
              <div className="detail-section__title">图�纸附件</div>
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

          {/* 完整�描述（如果有） */}
          {detail.descriptionFull && (
            <div className="detail-section">
              <div className="detail-section__title">完整�描述</div>
              <div className="detail-section__content" style={{ lineHeight: 1.6, color: '#333' }}>
                {detail.descriptionFull}
              </div>
            </div>
          )}
        </>
      ) : (
        {/* 未�购�买时的�锁定提示 */}
        <div className="detail-section detail-lock" style={{ textAlign: 'center', padding: '40px 0' }}>
          <Icon name="lock" size={48} color="#969799" />
          <div style={{ marginTop: 16, fontSize: 14, color: '#666' }}>�购�买后查看联系方式、图�纸附件及完整�描述</div>
        </div>
      )}

      {/* � 市场情报（若存在，�购�买后可见） */}
      {canViewFull && detail.marketIntelligence && detail.marketIntelligence.totalShares > 0 && (
        <div className="detail-section">
          <div className="detail-section__title">市场情报</div>
          <div className="detail-intelligence">
            <div className="detail-intelligence__summary">
              � 基于 {detail.marketIntelligence.totalShares} 位�购�买者�跟进
            </div>
            {detail.marketIntelligence.statusDistribution && Object.entries(detail.marketIntelligence.statusDistribution).map(([status, count]) => (
              <div key={status} className="detail-intelligence__item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>{status === 'initial_contact' ? '初步接�触' : status === 'interested' ? '意向明确' : status === 'negotiating' ? '谈判中' : status}</span>
                <span>{count} 人</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 投�稿人 */}
      <div className="detail-section">
        <div className="detail-section__title">投�稿人</div>
        <div className="detail-publisher">
          <div className="detail-publisher__avatar">{detail.publisherName?.[0] || '�匿'}</div>
          <div className="detail-publisher__info">
            <div className="detail-publisher__name">{detail.publisherName || '�匿名用户'}</div>
            {detail.publisherCompany && <div className="detail-publisher__company">{detail.publisherCompany}</div>}
          </div>
        </div>
      </div>

      {/* �� 操作按�钮 */}
      <div className="detail-footer">
        {!canViewFull && detail.status === 'active' && (
          <Button type="primary" block round loading={purchasing} onClick={handlePurchase}>
            � 花费 {detail.price} �积分解�锁
          </Button>
        )}
        {canViewFull && (
          <Button type="success" block round onClick={() => navigate('/crm')}>
            进入CRM管理
          </Button>
        )}
        {detail.isPurchased && (
          <Button plain block round style={{ marginTop: 8 }} onClick={() => setShowInvalidDialog(true)}>
            标记无效
          </Button>
        )}
      </div>

      {/* 无效标记�弹�窗 */}
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
            placeholder="可选�填写"
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
    }).catch(() => {});
  };

  const handleMarkInvalid = async () => {
    if (!invalidReason) return Toast.fail('请选择标记原因');
    
    try {
      await api.markInvalid(id, { reason: invalidReason, reasonText: invalidReasonText });
      Toast.success('标记成功');
      setShowInvalidDialog(false);
      // 重新加载
      const newDetail = await api.opportunity(id);
      setDetail(newDetail);
    } catch (e) {
      Toast.fail(e.message);
    }
  };

  if (loading) return <div className="empty-tip">加载中...</div>;
  if (!detail) return <div className="empty-tip">跟单不存在</div>;

  const meta = statusMeta(detail.status);
  const canViewFull = detail.isPurchased || detail.isPublisher;

  return (
    <div className="page">
      <NavBar title="跟单详情" leftArrow={<ArrowLeft width={20} height={20} />} onClickLeft={() => navigate(-1)} safeAreaInsetTop />

      {/* 标题区 */}
      <div className="detail-header">
        <div className="detail-header__top">
          <Tag color={meta.color} bg={meta.bg}>{meta.label}</Tag>
          <Tag type="primary">{detail.categoryName}</Tag>
        </div>
        <h2 className="detail-header__title">{detail.title}</h2>
        <div className="detail-header__meta">
          <span><Icon name="location-o" size={14} /> {detail.city || '未知城市'}</span>
          <span><Icon name="hotel-o" size={14} /> {detail.hotelName || '未知酒店'}</span>
          {detail.stage && <span><Icon name="clock-o" size={14} /> {stageLabel(detail.stage)}</span>}
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

      {/* 描述 */}
      <div className="detail-section">
        <div className="detail-section__title">跟单描述</div>
        <div className="detail-section__content">
          {canViewFull ? (detail.descriptionFull || detail.descriptionPublic || '暂无描述') : (detail.descriptionPublic || '购买后查看完整描述')}
        </div>
      </div>

      {/* 联系方式 - 仅购买者可见 */}
      {canViewFull ? (
        <div className="detail-section">
          <div className="detail-section__title">联系方式</div>
          <CellGroup>
            <Cell title="联系人" value={detail.contactName || '未填写'} />
            <Cell title="电话" value={detail.contactPhone || '未填写'} isLink onClick={() => detail.contactPhone && (window.location.href = `tel:${detail.contactPhone}`)} />
          </CellGroup>
        </div>
      ) : (
        <div className="detail-section detail-lock">
          <Icon name="lock" size={24} color="#969799" />
          <div>购买后查看联系方式</div>
        </div>
      )}

      {/* 市场情报 */}
      {detail.marketIntelligence && detail.marketIntelligence.totalShares > 0 && (
        <div className="detail-section">
          <div className="detail-section__title">市场情报</div>
          <div className="detail-intelligence">
            <div className="detail-intelligence__summary">
              基于 {detail.marketIntelligence.totalShares} 位购买者跟进
            </div>
            {detail.marketIntelligence.statusDistribution && Object.entries(detail.marketIntelligence.statusDistribution).map(([status, count]) => (
              <div key={status} className="detail-intelligence__item">
                <span>{status === 'initial_contact' ? '初步接触' : status === 'interested' ? '意向明确' : status === 'negotiating' ? '谈判中' : status}</span>
                <span>{count} 人</span>
              </div>
            ))}
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
            进入CRM管理
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
