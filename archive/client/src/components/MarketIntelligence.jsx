import { useState } from 'react';
import { Button, Dialog, Field, Tag, Toast } from 'react-vant';
import Icon from './Icon';
import Pagination from './Pagination';
import { api } from '../api';
import { followUpStatusLabel, timeAgo, SHARE_INVALID_REASONS } from '../constants';

export default function MarketIntelligence({ intelligence, onLiked }) {
  const [likingId, setLikingId] = useState(null);
  const [reporting, setReporting] = useState(null);
  const [reportReason, setReportReason] = useState('info_fake');
  const [reportText, setReportText] = useState('');
  const [reportingId, setReportingId] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 6;

  if (!intelligence || !intelligence.totalShares || intelligence.totalShares <= 0) return null;

  const distribution = intelligence.statusDistribution || {};
  const board = intelligence.shareBoard || [];
  const totalPages = Math.ceil(board.length / pageSize);
  const visible = board.slice((page - 1) * pageSize, page * pageSize);

  const handleLike = async (shareId, isOwn, isLiked) => {
    if (isOwn || isLiked || likingId) return;
    setLikingId(shareId);
    try {
      await api.markHelpful({ shareId });
      Toast.success('点赞成功');
      if (onLiked) onLiked();
    } catch (e) {
      Toast.fail(e.message || '点赞失败');
    } finally {
      setLikingId(null);
    }
  };

  const openReport = (shareId) => {
    setReporting(shareId);
    setReportReason('info_fake');
    setReportText('');
  };

  const handleReport = async () => {
    if (reporting === null || reportingId) return;
    setReportingId(reporting);
    try {
      await api.reportShare({
        shareId: reporting,
        reason: reportReason,
        reasonText: reportText.trim() || undefined,
      });
      Toast.success('举报成功');
      setReporting(null);
      if (onLiked) onLiked();
    } catch (e) {
      Toast.fail(e.message || '举报失败');
    } finally {
      setReportingId(null);
    }
  };

  return (
    <div className="mi-block">
      <div className="mi-summary">
        {intelligence.totalShares} 位购买者共享了进度
      </div>

      {Object.keys(distribution).length > 0 && (
        <div className="mi-status-row">
          {Object.entries(distribution).map(([status, count]) => (
            <span key={status} className="mi-status-pill">{followUpStatusLabel(status)} {count}</span>
          ))}
        </div>
      )}

      {board.length > 0 && (
        <div className="mi-board">
          <div className="mi-board__title">共享进度榜</div>
          {visible.map((s, idx) => (
            <div key={s.shareId} className={`mi-share-item ${s.isOwn ? 'mi-share-item--own' : ''}`}>
              <div className="mi-share-rank">{(page - 1) * pageSize + idx + 1}</div>
              <div className="mi-share-main">
                <div className="mi-share-row">
                  <Tag size="mini">{followUpStatusLabel(s.status)}</Tag>
                  <span className="mi-share-user">{s.isOwn ? '我' : s.nickname}</span>
                  <span className="mi-share-time">{timeAgo(s.createdAt)}</span>
                </div>
                {s.summary && <div className="mi-share-summary">{s.summary}</div>}
              </div>
              <div className="mi-actions">
                {!s.isOwn && (
                  <button
                    type="button"
                    className={`mi-report-btn ${s.isReported ? 'mi-report-btn--reported' : ''}`}
                    disabled={s.isReported}
                    onClick={() => openReport(s.shareId)}
                  >
                    <Icon name="close" size={12} />
                    <span>{s.isReported ? '已举报' : (s.reportCount > 0 ? `无效 ${s.reportCount}` : '无效')}</span>
                  </button>
                )}
                <button
                  type="button"
                  className={`mi-like-btn ${s.isLiked ? 'mi-like-btn--liked' : ''} ${s.isOwn ? 'mi-like-btn--disabled' : ''}`}
                  disabled={s.isOwn || s.isLiked || likingId === s.shareId}
                  onClick={() => handleLike(s.shareId, s.isOwn, s.isLiked)}
                >
                  <Icon name="good-job-o" size={14} />
                  <span>{s.helpfulCount || 0}</span>
                </button>
              </div>
            </div>
          ))}
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          )}
        </div>
      )}

      <Dialog
        visible={reporting !== null}
        title="举报无效情报"
        showCancelButton
        confirmButtonText={reportingId ? '提交中' : '提交'}
        onConfirm={handleReport}
        onCancel={() => setReporting(null)}
      >
        <div className="dialog-body">
          <div className="dialog-body__label">举报原因：</div>
          <div className="status-chips">
            {SHARE_INVALID_REASONS.map((r) => (
              <Button
                key={r.value}
                size="small"
                type={reportReason === r.value ? 'primary' : 'default'}
                onClick={() => setReportReason(r.value)}
              >
                {r.label}
              </Button>
            ))}
          </div>
          <Field
            label="补充说明"
            placeholder="选填，说明不实之处"
            value={reportText}
            onChange={(v) => setReportText(v)}
          />
          <div className="dialog-tip">多次被举报的情报将自动下架。</div>
        </div>
      </Dialog>
    </div>
  );
}