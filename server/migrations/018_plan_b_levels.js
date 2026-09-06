import { query, queryOne } from '../db.js';

const FINAL_LEVEL_ENUM = "enum('normal','premium')";

async function enumType(table, column) {
  const row = await queryOne(
    `SELECT COLUMN_TYPE AS t FROM information_schema.COLUMNS
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column]
  );
  return row?.t || '';
}

/**
 * 方案 B：定价制分佣 + 等级两档化（.monkeycode/specs/commission-plan-b/）
 * 1) member_levels 增 seller_commission_rate 列
 * 2) 等级 4 档并为 2 档：normal 调参、silver->normal、gold/expert->premium
 * 3) member_levels.level_key 与 user_level_stats.level ENUM 收紧为 ('normal','premium')
 * 4) 废止全局抽成/基准配置键；无效惩罚比例升幅收敛为 0.20（回扣 1.2 倍）
 * 幂等：每步先查当前状态再操作，中途失败可在下次启动继续收敛。
 */
export const migratePlanBLevels = async () => {
  const col = await queryOne(
    `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
     WHERE table_schema = DATABASE() AND table_name = 'member_levels' AND column_name = 'seller_commission_rate'`
  );
  if (!col || col.cnt === 0) {
    await query("ALTER TABLE member_levels ADD COLUMN seller_commission_rate DECIMAL(4,2) NOT NULL DEFAULT 0.76 COMMENT '定价制分佣率'");
    console.log('[migration] member_levels.seller_commission_rate added');
  }

  const oldLevels = await query("SELECT COUNT(*) as cnt FROM member_levels WHERE level_key IN ('silver','gold','expert')");
  const premiumRow = await queryOne("SELECT id FROM member_levels WHERE level_key = 'premium'");
  if (Number(oldLevels[0]?.cnt || 0) > 0 || !premiumRow) {
    // level_key 允许写入 'premium'（若仍为旧四值 ENUM 则先扩）
    const mlEnum = await enumType('member_levels', 'level_key');
    if (!mlEnum.includes('premium')) {
      await query("ALTER TABLE member_levels MODIFY COLUMN level_key ENUM('normal','silver','gold','expert','premium') NOT NULL");
    }
    const statsHasOld = await query("SELECT COUNT(*) as cnt FROM user_level_stats WHERE level IN ('gold','expert','silver')");
    if (Number(statsHasOld[0]?.cnt || 0) > 0) {
      const ulsEnum = await enumType('user_level_stats', 'level');
      if (!ulsEnum.includes('premium')) {
        await query("ALTER TABLE user_level_stats MODIFY COLUMN level ENUM('normal','silver','gold','expert','premium') DEFAULT 'normal'");
      }
      await query("UPDATE user_level_stats SET level = 'premium' WHERE level IN ('gold','expert')");
      await query("UPDATE user_level_stats SET level = 'normal' WHERE level = 'silver'");
    }

    await query("DELETE FROM member_levels WHERE level_key IN ('silver','gold','expert')");
    const normal = await queryOne("SELECT id FROM member_levels WHERE level_key = 'normal'");
    if (normal) {
      await query(
        `UPDATE member_levels SET
           name = '普通会员', purchase_discount = 1.00, seller_commission_rate = 0.76, commission_bonus = 0,
           purchase_rate_threshold = 0, invalid_rate_threshold = 100, helpful_rate_threshold = 0,
           activity_threshold = 0, free_audit = 0, mark_weight = 1, sort_order = 1
         WHERE id = ?`,
        [normal.id]
      );
    } else {
      await query(
        `INSERT INTO member_levels
           (level_key, name, purchase_discount, seller_commission_rate, commission_bonus,
            purchase_rate_threshold, invalid_rate_threshold, helpful_rate_threshold,
            activity_threshold, free_audit, mark_weight, sort_order)
         VALUES ('normal', '普通会员', 1.00, 0.76, 0, 0, 100, 0, 0, 0, 1, 1)`
      );
    }
    if (premiumRow) {
      await query(
        `UPDATE member_levels SET
           name = '高级会员', purchase_discount = 0.85, seller_commission_rate = 0.80, commission_bonus = 0,
           purchase_rate_threshold = 30, invalid_rate_threshold = 10, helpful_rate_threshold = 20,
           activity_threshold = 50, free_audit = 1, mark_weight = 2, sort_order = 2
         WHERE id = ?`,
        [premiumRow.id]
      );
    } else {
      await query(
        `INSERT INTO member_levels
           (level_key, name, purchase_discount, seller_commission_rate, commission_bonus,
            purchase_rate_threshold, invalid_rate_threshold, helpful_rate_threshold,
            activity_threshold, free_audit, mark_weight, sort_order)
         VALUES ('premium', '高级会员', 0.85, 0.80, 0, 30, 10, 20, 50, 1, 2, 2)`
      );
    }
    console.log('[migration] plan-B levels applied: member_levels normalized to two tiers');
  }

  // 数据全部两档化后收紧两处 ENUM（若旧值仍被行引用则保留，避免截断）
  for (const [table, column] of [['member_levels', 'level_key'], ['user_level_stats', 'level']]) {
    const t = await enumType(table, column);
    if (t !== FINAL_LEVEL_ENUM) {
      const stale = await query(`SELECT COUNT(*) as cnt FROM ${table} WHERE ${column} IN ('silver','gold','expert')`);
      if (Number(stale[0]?.cnt || 0) === 0) {
        if (table === 'member_levels') {
          await query('ALTER TABLE member_levels MODIFY COLUMN level_key ENUM(\'normal\',\'premium\') NOT NULL');
        } else {
          await query("ALTER TABLE user_level_stats MODIFY COLUMN level ENUM('normal','premium') DEFAULT 'normal'");
        }
        console.log(`[migration] ${table}.${column} ENUM tightened to (normal, premium)`);
      }
    }
  }

  // 安全缓冲：任一等级组合不得穿仓（最低折扣 >= 最高分佣率）
  const guard = await queryOne(
    'SELECT MIN(purchase_discount) AS min_disc, MAX(seller_commission_rate) AS max_rate FROM member_levels'
  );
  if (guard && Number(guard.min_disc) < Number(guard.max_rate)) {
    throw new Error(
      `[migration] 等级参数穿仓风险：最低折扣 ${guard.min_disc} < 最高分佣率 ${guard.max_rate}，请调整 member_levels`
    );
  }

  await query("DELETE FROM system_configs WHERE config_key IN ('platform_commission_rate', 'seller_commission_base_rate')");
  await query("UPDATE system_configs SET config_value = '0.20' WHERE config_key = 'invalid_penalty_rate' AND CAST(config_value AS DECIMAL(4,2)) > 0.20");
};
