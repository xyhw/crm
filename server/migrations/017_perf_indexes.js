import { query } from '../db.js';

/**
 * P2 性能索引：针对高频只读查询补充复合索引，减少 GROUP BY / 过滤回表。
 * 全部为幂等 CREATE INDEX（已存在则跳过）。
 */
export async function migrateP2Indexes() {
  const statements = [
    // 商机列表聚合：follow_up_shares 按 opportunity_id 聚合已审核进展
    'CREATE INDEX idx_shares_opp_audit ON follow_up_shares (opportunity_id, audit_status)',

    // 商机详情：判断购买态 ORDER BY created_at 排序
    'CREATE INDEX idx_orders_user_opp ON orders (user_id, opportunity_id, status)',

    // 商机列表推荐/热门排序：status + purchase_count
    'CREATE INDEX idx_opp_status_purchase ON opportunities (status, purchase_count)',

    // 商机详情：按商机查询分享 + 审核状态
    'CREATE INDEX idx_shares_audit_helpful ON follow_up_shares (audit_status, helpful_count)',

    // 用户点赞/举报标记：按用户查询防重复
    'CREATE INDEX idx_marks_user_share_like ON follow_up_helpful_marks (user_id, share_id)',
    'CREATE INDEX idx_marks_user_share_report ON follow_up_share_invalid_marks (user_id, share_id)',
  ];

  for (const sql of statements) {
    try {
      await query(sql);
      console.log(`[migration] ${sql.split('(')[0].trim()} applied`);
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log(`[migration] index already exists, skip: ${sql.split('(')[0].trim()}`);
      } else {
        console.error(`[migration] failed: ${sql}`, error.message);
      }
    }
  }
}