import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  NavBar,
  Tag,
  Button,
  Dialog,
  Field,
  Toast,
  Popup,
  NoticeBar,
} from 'react-vant';
import Icon from '../components/Icon';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { categoryIcon, stageLabel, formatTime } from '../constants';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState(null); // 'help' | 'report'
  const [text, setText] = useState('');

  const load = async () => {
    try {
      const res = await api.order(id);
      setOrder(res);
    } catch (e) {
      Toast.fail(e.message);
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (loading || !order) return <div className="empty-tip">加载中...</div>;

  const isPublisher = user?.id === order.publisherId;
  const canClose = isPublisher && order.status !== 'done' && order.status !== 'closed';
  const myHelp = order.helps?.find((h) => h.userId === user?.id && h.status !== 'rejected');
  const statusMetaMap = {
    open: { color: '#1677ff', bg: '#e8f1ff' },
    helping: { color: '#ed6a0c', bg: '#fff4e8' },
    done: { color: '#07c160', bg: '#e9faef' },
    closed: { color: '#969799', bg: '#f2f3f5' },
  };
  const meta = statusMetaMap[order.status] || statusMetaMap.open;

  const handleHelp = async () => {
    if (action === 'help') {
      setAction(null);
      return;
    }
    setAction('help');
    setText('');
  };

  const submitHelp = async () => {
    try {
      await api.helpOrder(order.id, text);
      Toast.success('认领成功，请尽快跟进');
      setAction(null);
      load();
    } catch (e) {
      Toast.fail(e.message);
    }
  };

  const submitReport = async (helpId) => {
    if (!text.trim()) {
      Toast.fail('请填写跟进内容');
      return;
    }
    try {
      await api.reportHelp(order.id, helpId, text);
      Toast.success('跟进报告已提交');
      setAction(null);
      load();
    } catch (e) {
      Toast.fail(e.message);
    }
  };

  const confirmHelp = (help) => {
    Dialog.confirm({
      title: '确认互助成功',
      message: `确认后将向「${help.helper?.nickname || '互助人'}」发放 ${order.reward} 积分奖励`,
    })
      .then(async () => {
        try {
          await api.confirmHelp(order.id, help.id);
          Toast.success('已确认，积分已发放');
          load();
        } catch (e) {
          Toast.fail(e.message);
        }
      })
      .catch(() => {});
  };

  const rejectHelp = (help) => {
    Dialog.confirm({ title: '拒绝该互助', message: '确认拒绝这条互助申请吗？' })
      .then(async () => {
        try {
          await api.rejectHelp(order.id, help.id);
          Toast.success('已拒绝');
          load();
        } catch (e) {
          Toast.fail(e.message);
        }
      })
      .catch(() => {});
  };

  const closeOrder = () => {
    Dialog.confirm({ title: '关闭跟单', message: '关闭后不可再被认领，确定关闭吗？' })
      .then(async () => {
        try {
          await api.closeOrder(order.id);
          Toast.success('已关闭');
          load();
        } catch (e) {
          Toast.fail(e.message);
        }
      })
      .catch(() => {});
  };

  return (
    <div className="detail-page">
      <NavBar
        title="跟单详情"
        leftText="返回"
        onClickLeft={() => navigate(-1)}
        rightText={canClose ? '关闭' : ''}
        onClickRight={canClose ? closeOrder : undefined}
        safeAreaInsetTop
      />

      <div className="page">
        <div className="detail-card">
          <div className="flex-between">
            <span className="detail-card__title">
              <span style={{ marginRight: 4 }}>{categoryIcon(order.category)}</span>
              {order.title}
            </span>
            <Tag color={meta.color} style={{ flexShrink: 0, marginLeft: 8 }}>
              {order.statusLabel}
            </Tag>
          </div>

          <div className="detail-meta">
            <span className="detail-meta__item">
              <Icon name="shop-o" size={14} /> {order.hotelName}
              {order.city ? `（${order.city}）` : ''}
            </span>
            <span className="detail-meta__item">
              <Icon name="label-o" size={14} /> {order.categoryLabel}
            </span>
            <span className="detail-meta__item">
              <Icon name="clock-o" size={14} /> {order.stageLabel}
            </span>
            <span className="detail-meta__item">
              <Icon name="gold-coin-o" size={14} /> 互助奖励{' '}
              <b className="points-text">{order.reward} 积分</b>
            </span>
          </div>

          {order.notes ? (
            <div className="detail-notes">
              <div className="detail-section__title">补充说明</div>
              <div className="detail-notes__body">{order.notes}</div>
            </div>
          ) : null}

          {order.deadline ? (
            <div className="detail-deadline">
              <Icon name="alarm-o" size={14} /> 截止时间：{formatTime(order.deadline)}
            </div>
          ) : null}
        </div>

        {/* 发布者信息 */}
        <div className="detail-card">
          <div className="detail-section__title">发布者</div>
          <div className="flex-between">
            <div>
              <div className="publisher-name">{order.publisher?.nickname || '未知用户'}</div>
              <div className="publisher-meta">
                {order.publisher?.categoryLabel} · {order.publisher?.levelLabel || '新手互助人'}
                {order.publisher?.company ? ` · ${order.publisher.company}` : ''}
              </div>
            </div>
            {isPublisher && order.status === 'open' ? (
              <Button size="small" type="warning" plain onClick={closeOrder}>
                关闭跟单
              </Button>
            ) : null}
          </div>
        </div>

        {/* 互助记录 */}
        {order.helps && order.helps.length > 0 ? (
          <div className="detail-card">
            <div className="detail-section__title">
              互助记录（{order.helps.filter((h) => h.status !== 'rejected').length}）
            </div>
            {order.helps.map((h) => {
              const isMyHelp = h.userId === user?.id;
              return (
                <div className="help-item" key={h.id}>
                  <div className="help-item__head">
                    <div className="helper-info">
                      <span className="helper-name">{isMyHelp ? '我' : h.helper?.nickname || '互助人'}</span>
                      <span className="helper-company">{h.helper?.company || h.helper?.categoryLabel || ''}</span>
                    </div>
                    <Tag color={h.status === 'confirmed' ? '#07c160' : h.status === 'rejected' ? '#969799' : '#ed6a0c'}>
                      {h.statusLabel}
                    </Tag>
                  </div>
                  {h.message ? <div className="help-message">{h.message}</div> : null}

                  {(h.reports || []).map((r) => (
                    <div className="report-item" key={r.id}>
                      <div className="report-item__time">{formatTime(r.createdAt)}</div>
                      <div className="report-item__content">{r.content}</div>
                    </div>
                  ))}

                  {isPublisher && h.status === 'active' && (
                    <div className="help-actions">
                      <Button size="mini" type="primary" onClick={() => confirmHelp(h)}>
                        确认成功
                      </Button>
                      <Button size="mini" onClick={() => rejectHelp(h)}>
                        拒绝
                      </Button>
                    </div>
                  )}

                  {isPublisher && h.status === 'reported' && (
                    <div className="help-actions">
                      <Button size="mini" type="primary" onClick={() => confirmHelp(h)}>
                        确认成功
                      </Button>
                      <Button size="mini" onClick={() => rejectHelp(h)}>
                        拒绝
                      </Button>
                    </div>
                  )}

                  {isMyHelp && h.status === 'active' && (
                    <div className="help-actions">
                      <Button size="mini" type="primary" onClick={() => { setAction('report'); setText(''); }}>
                        提交跟进报告
                      </Button>
                    </div>
                  )}

                  {h.status === 'rejected' && (
                    <div className="help-rejected">该互助已被发布者拒绝</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        {/* 底部操作 */}
        {!isPublisher && order.status === 'open' && (
          <Button type="primary" block round onClick={() => handleHelp()}>
            认领此跟单
          </Button>
        )}

        {isPublisher && order.status === 'open' && (
          <NoticeBar text="等待其他供应商认领你的跟单，认领后可查看对方提交的跟进报告" />
        )}

        {myHelp && myHelp.status === 'confirmed' && (
          <NoticeBar color="#07c160" text="该互助已完成，积分已入账，可在积分页面查看" />
        )}
      </div>

      {/* 认领弹窗 */}
      <Popup visible={action === 'help'} onClose={() => setAction(null)} position="bottom" round safeAreaInsetBottom>
        <div className="action-pop">
          <div className="action-pop__title">认领跟单</div>
          <div className="action-pop__desc">
            认领后请主动联系发布者并提供资源对接，完成跟进可获得 <b className="points-text">{order.reward} 积分</b>
          </div>
          <Field
            value={text}
            onChange={(v) => setText(v)}
            type="textarea"
            rows={3}
            autosize
            placeholder="填写你能提供的帮助（如：可对接 XX 酒店采购资源）"
          />
          <div className="action-pop__btns">
            <Button block round type="primary" onClick={submitHelp}>
              确认认领
            </Button>
          </div>
        </div>
      </Popup>

      {/* 提交报告弹窗 */}
      <Popup visible={action === 'report'} onClose={() => setAction(null)} position="bottom" round safeAreaInsetBottom>
        <div className="action-pop">
          <div className="action-pop__title">提交跟进报告</div>
          <div className="action-pop__desc">描述你的跟进进展，发布者确认后发放积分</div>
          <Field
            value={text}
            onChange={(v) => setText(v)}
            type="textarea"
            rows={4}
            autosize
            placeholder="如：已联系到 XX 酒店采购负责人，获取到关键资源信息..."
          />
          <div className="action-pop__btns">
            <Button block round type="primary" onClick={() => submitReport(myHelp?.id)}>
              提交报告
            </Button>
          </div>
        </div>
      </Popup>
    </div>
  );
}
