import { query } from '../db.js';

/**
 * 市场情报聚合：商机下已审核通过的同行进展 + 当前用户点赞/举报状态回显。
 * 由商机详情（opportunity.routes）与 CRM 商机详情（crm.routes）共用，
 * 替代原先两处近乎相同的复制块。投稿人全匿名，不返回昵称。
 */
export async function buildMarketIntelligence({ opportunityId, userId }) {
  const [shares, likes, reports] = await Promise.all([
    query(
      `SELECT s.id, s.status, s.summary, s.helpful_count, s.report_count, s.created_at, s.user_id
       FROM follow_up_shares s
       WHERE s.opportunity_id = ? AND s.audit_status = 'approved'
       ORDER BY s.helpful_count DESC, s.created_at DESC`,
      [opportunityId]
    ),
    query(
      `SELECT m.share_id FROM follow_up_helpful_marks m
       JOIN follow_up_shares s ON m.share_id = s.id
       WHERE m.user_id = ? AND s.opportunity_id = ?`,
      [userId, opportunityId]
    ),
    query(
      `SELECT m.share_id FROM follow_up_share_invalid_marks m
       JOIN follow_up_shares s ON m.share_id = s.id
       WHERE m.user_id = ? AND s.opportunity_id = ?`,
      [userId, opportunityId]
    ),
  ]);

  const myLikedShares = new Set(likes.map((l) => l.share_id));
  const myReportedShares = new Set(reports.map((r) => r.share_id));
  const statusCounts = {};
  shares.forEach((s) => {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
  });

  return {
    totalShares: shares.length,
    statusDistribution: statusCounts,
    shareBoard: shares.slice(0, 100).map((s) => ({
      shareId: s.id,
      status: s.status,
      summary: s.summary,
      helpfulCount: s.helpful_count,
      createdAt: s.created_at,
      isOwn: userId === s.user_id,
      isLiked: myLikedShares.has(s.id),
      reportCount: s.report_count || 0,
      isReported: myReportedShares.has(s.id),
    })),
  };
}
