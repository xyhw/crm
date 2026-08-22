import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tag, Toast, Button, Dialog, Field, CellGroup, Cell, Radio } from 'react-vant';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import PageNavBar from '../components/PageNavBar';
import Icon from '../components/Icon';
import MarketIntelligence from '../components/MarketIntelligence';
import AttachmentGrid from '../components/AttachmentGrid';
import { stageLabel, statusMeta, INVALID_REASONS, levelMeta, maskName, formatDate } from '../constants';

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
      .then((res) => {
        setDetail(res);
        // 记录已读基线：商机详情页访问后，标记该商机摘要已读总数
        const total = res?.marketIntelligence?.totalShares || 0;
        try {
          localStorage.setItem(`viewedShares_${id}`, String(total));
        } catch {}
      })
      .catch((e) => Toast.fail(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const refreshDetail = async () => {
    try {
      const res = await api.opportunity(id);
      setDetail(res);
    } catch (e) {}
  };

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
  const publisherDisplay = maskName(detail.publisherName);

  // 未购买时的预览文本：仅从公开描述取前 2 行
  const previewSource = detail.descriptionPublic || '';
  const previewLines = previewSource.split('\n').filter(Boolean).slice(0, 2).join('\n');

  return (
    <div className="page">
      <PageNavBar title="商机详情" onClickLeft={() => navigate(-1)} />

      {/* 概览卡片：标题 + 标签 + 价格 + 统计 */}
      <div className="detail-overview">
        {detail.isPurchased && (
          <div className="detail-overview__badge">
            <Tag type="success" plain>已购买</Tag>
          </div>
        )}
        <div className="detail-overview__tags">
          <Tag color={meta.color} bg={meta.bg}>{meta.label}</Tag>
          <Tag type="primary">{detail.categoryName}</Tag>
        </div>
        <h2 className="detail-overview__title">{detail.title}</h2>
        <div className="detail-overview__meta">
          <span><Icon name="location-o" size={13} /> {detail.city || '未知城市'}</span>
          <span><Icon name="hotel-o" size={13} /> {displayBrand}</span>
          {detail.createdAt && <span><Icon name="clock-o" size={13} /> {formatDate(detail.createdAt) || '未知'}</span>}
        </div>
        {detail.tags && detail.tags.length > 0 && (
          <div className="detail-overview__tag-list">
            {detail.tags.map((t) => (
              <Tag key={t.id} type="primary" plain size="medium">{t.name}</Tag>
            ))}
          </div>
        )}
        <div className="detail-overview__price-bar">
          <div className="detail-overview__price">
            {detail.price} <span>积分</span>
          </div>
          <div className="detail-overview__stats">
            <span>{detail.purchaseCount || 0} 人购买</span>
            <span>{detail.viewCount || 0} 次浏览</span>
            {detail.invalidMarkCount > 0 && <span className="text-danger">{detail.invalidMarkCount} 人标记无效</span>}
          </div>
        </div>
      </div>

      {/* === 未购买：预览 + 渐变遮罩 === */}
      {!canViewFull ? (
        <>
          {previewLines ? (
            <div className="detail-preview">
              <div className="detail-section__title">需求描述</div>
              <div className="detail-preview__text">
                {previewLines}
              </div>
              <div className="detail-preview__mask" />
              <div className="detail-preview__lock">
                <Icon name="lock" size={36} color="var(--text-color-3)" />
                <span>购买后查看完整内容</span>
              </div>
            </div>
          ) : (
            <div className="detail-section detail-lock">
              <Icon name="lock" size={48} color="var(--text-color-3)" />
              <div className="detail-lock__text">购买后查看需求描述、项目现状、具体地址、联系人、项目概要及图纸附件</div>
            </div>
          )}

          {/* 投稿人（脱敏） */}
          <div className="detail-section">
            <div className="detail-section__title">投稿人</div>
            <div className="detail-publisher">
              <div className="detail-publisher__avatar">{publisherDisplay?.[0] || '匿'}</div>
              <div className="detail-publisher__info">
                <div className="detail-publisher__name">{publisherDisplay}</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* === 购买后：完整信息展示 === */
        <>
          {/* 需求描述 */}
          {detail.descriptionPublic && (
            <div className="detail-section">
              <div className="detail-section__title">需求描述</div>
              <div className="detail-section__content detail-section__content--rich">
                {detail.descriptionPublic}
              </div>
            </div>
          )}

          {/* 项目信息 */}
          {(detail.stage || detail.validUntil || detail.address) && (
            <div className="detail-section">
              <div className="detail-section__title">项目信息</div>
              <div className="detail-info-grid">
                {detail.stage && (
                  <div className="detail-info-grid__item">
                    <span className="detail-info-grid__label">项目现状</span>
                    <span className="detail-info-grid__value">{stageLabel(detail.stage)}</span>
                  </div>
                )}
                {detail.validUntil && (
                  <div className="detail-info-grid__item">
                    <span className="detail-info-grid__label">有效期</span>
                    <span className="detail-info-grid__value">{formatDate(detail.validUntil)}</span>
                  </div>
                )}
                {detail.address && (
                  <div className="detail-info-grid__item detail-info-grid__item--full">
                    <span className="detail-info-grid__label">具体地址</span>
                    <span className="detail-info-grid__value">{detail.address}</span>
                  </div>
                )}
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
              <AttachmentGrid files={detail.attachments} />
            </div>
          )}

          {/* 项目概要 */}
          {detail.descriptionFull && (
            <div className="detail-section">
              <div className="detail-section__title">项目概要</div>
              <div className="detail-section__content detail-section__content--rich">
                {detail.descriptionFull}
              </div>
            </div>
          )}

          {/* 共享进度榜 */}
          {detail.marketIntelligence && detail.marketIntelligence.totalShares > 0 && (
            <div className="detail-section">
              <div className="detail-section__title">共享进度</div>
              <MarketIntelligence intelligence={detail.marketIntelligence} onLiked={refreshDetail} />
            </div>
          )}

          {/* 投稿人（匿名） */}
          <div className="detail-section">
            <div className="detail-section__title">投稿人</div>
            <div className="detail-publisher">
              <div className="detail-publisher__avatar">{publisherDisplay?.[0] || '匿'}</div>
              <div className="detail-publisher__info">
                <div className="detail-publisher__name">{publisherDisplay}</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 底部固定操作栏 */}
      <div className="detail-action-bar">
        {!canViewFull && detail.status === 'active' ? (
          <Button type="primary" block round size="large" loading={purchasing} onClick={handlePurchase}>
            花费 {detail.price} 积分解锁全部信息
          </Button>
        ) : canViewFull ? (
          <div className="detail-action-bar__group">
            <Button type="success" round onClick={() => navigate('/crm')}>
              {detail.isPublisher ? '查看跟进分布' : '进入CRM'}
            </Button>
            {detail.isPurchased && detail.crmId && (
              <>
                <Button plain round onClick={() => navigate(`/crm/${detail.crmId}`)}>新增跟进</Button>
                <Button plain round onClick={() => navigate(`/crm/${detail.crmId}#share`)}>共享进度</Button>
              </>
            )}
            {detail.isPurchased && (
              <Button plain round className="detail-action-bar__btn-warn" onClick={() => setShowInvalidDialog(true)}>标记无效</Button>
            )}
          </div>
        ) : null}
      </div>

      {/* 无效标记弹窗 */}
      <Dialog
        visible={showInvalidDialog}
        title="标记无效"
        showCancelButton
        onConfirm={handleMarkInvalid}
        onCancel={() => setShowInvalidDialog(false)}
      >
        <div className="dialog-body">
          <div className="dialog-body__label">请选择标记原因：</div>
          {INVALID_REASONS.map((r) => (
            <Radio key={r.value} checked={invalidReason === r.value} onChange={() => setInvalidReason(r.value)} className="dialog-radio">
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
