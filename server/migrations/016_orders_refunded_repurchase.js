import { query, queryOne } from '../db.js';

/**
 * 允许退款后重新购买同一商机：
 * MySQL 的唯一索引不允许"排除已退款订单"，因此将 uk_user_opp(user_id, opportunity_id)
 * 替换为基于生成列的"仅 paid 生效"唯一约束（refunded 订单 paid_opp_key 为 NULL，
 * NULL 不参与唯一性判断，故退款后可再次购买）。
 * 幂等：仅当旧约束存在时执行重建。
 */
export const migrateOrdersRefundedRepurchase = async () => {
  try {
    const stat = await queryOne(
      "SELECT COUNT(*) as cnt FROM information_schema.STATISTICS WHERE table_schema = DATABASE() AND table_name = 'orders' AND index_name = 'uk_user_opp'"
    );
    const exists = (stat && stat.cnt > 0) || false;

    if (!exists) {
      console.log('[migration] orders.uk_user_opp already rebuilt, skip');
      return;
    }

    await query(`ALTER TABLE orders
      DROP INDEX uk_user_opp,
      ADD COLUMN paid_opp_key BIGINT UNSIGNED
        GENERATED ALWAYS AS (CASE WHEN status = 'paid' THEN opportunity_id ELSE NULL END) STORED,
      ADD UNIQUE KEY uk_user_paid_opp (user_id, paid_opp_key)`);

    console.log('[migration] orders uk_user_opp -> uk_user_paid_opp (refunded repurchase enabled)');
  } catch (err) {
    // 生成列已存在等情况视为幂等失败，重试前确认
    console.error('[migration] rebuild orders unique key error:', err.message);
    throw err;
  }
};