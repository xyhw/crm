import { query } from '../db.js';

/**
 * P0 优化 migration（幂等）：
 * 1. user_login_days 登录打卡表（活跃度「登录频率」指标 + 周活跃加分）
 * 2. member_levels 加 commission_rate 分佣比例列（购买无折扣、等级只影响分佣）
 *    - purchase_discount 全部置 1.00（购买统一原价）
 *    - activity_threshold 语义改为 0~100 活跃度分：银牌 30 / 金牌 50 / 达人 70
 * 3. opportunities 加 audit_status / audit_reason（信用分 60~80 投稿需审核）
 * 4. system_configs 加 credit_instant_threshold（≥80 即时上架线）
 * 5. 存量积分补正：奖励类积极分按 180 天有效期补设 expires_at；充值/分佣/人工调整永久（保持 NULL）
 */
export const migrateP0Optimizations = async () => {
  // 1. 登录打卡表
  await query(`
    CREATE TABLE IF NOT EXISTS user_login_days (
      id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      login_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_user_date (user_id, login_date)
    ) ENGINE=InnoDB
  `);
  console.log('[migration] user_login_days table ready');

  // 2a. member_levels 分佣比例列（DECIMAL(4,3) 存 0.700~0.850）
  const cols = await query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'member_levels' AND COLUMN_NAME = 'commission_rate'`
  );
  if (!Array.isArray(cols) || cols.length === 0) {
    await query(`ALTER TABLE member_levels ADD COLUMN commission_rate DECIMAL(4,3) NOT NULL DEFAULT 0.700 AFTER purchase_discount`);
  }
  // 按用户拍板：普通 70 / 银牌 75 / 金牌 80 / 达人 85（INSERT 生效行 + 已有行都覆盖）
  await query(`UPDATE member_levels SET commission_rate = 0.700 WHERE level_key = 'normal'`);
  await query(`UPDATE member_levels SET commission_rate = 0.750 WHERE level_key = 'silver'`);
  await query(`UPDATE member_levels SET commission_rate = 0.800 WHERE level_key = 'gold'`);
  await query(`UPDATE member_levels SET commission_rate = 0.850 WHERE level_key = 'expert'`);

  // 2b. 购买统一原价：折扣全部置 1.00
  await query(`UPDATE member_levels SET purchase_discount = 1.00`);

  // 2c. activity_threshold 语义改为 0~100 活跃度分
  await query(`UPDATE member_levels SET activity_threshold = 30 WHERE level_key = 'silver'`);
  await query(`UPDATE member_levels SET activity_threshold = 50 WHERE level_key = 'gold'`);
  await query(`UPDATE member_levels SET activity_threshold = 70 WHERE level_key = 'expert'`);
  await query(`UPDATE member_levels SET activity_threshold = 0 WHERE level_key = 'normal'`);
  console.log('[migration] member_levels commission_rate / purchase_discount / activity_threshold ready');

  // 3. 商机审核字段（信用分 60~80 投稿需审核）
  const auditCols = await query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'opportunities' AND COLUMN_NAME = 'audit_status'`
  );
  if (!Array.isArray(auditCols) || auditCols.length === 0) {
    await query(`
      ALTER TABLE opportunities
        ADD COLUMN audit_status ENUM('none','pending','approved','rejected') NOT NULL DEFAULT 'none' AFTER status,
        ADD COLUMN audit_reason VARCHAR(200) NULL AFTER audit_status,
        ADD KEY idx_audit_status (audit_status, status)
    `);
  }
  console.log('[migration] opportunities.audit_status / audit_reason ready');

  // 4. 信用分即时上架线（≥80 即时上架，60~80 需审核）
  await query(`
    INSERT IGNORE INTO system_configs (config_key, config_value, config_type, description)
    VALUES ('credit_instant_threshold', '80', 'number', '信用分即时上架阈值（≥此值投稿免审，60~此值需审核）')
  `);
  console.log('[migration] system_configs.credit_instant_threshold ready');

  // 5. 存量积分补正：
  //    - 奖励类（有效期来源）补设 expires_at = created_at + 180 天（仅未来的，已过期的交给清理任务按新规则处理）
  //    - 充值/分佣/人工调整保持 NULL（永久有效），无需处理
  const fixResult = await query(`
    UPDATE points_logs
    SET expires_at = DATE_ADD(created_at, INTERVAL 180 DAY)
    WHERE delta > 0
      AND expires_at IS NULL
      AND source_type IN ('register_gift', 'invite_gift', 'reward', 'share_reward', 'helpful_reward')
  `);
  const affected = fixResult?.affectedRows ?? 0;
  console.log(`[migration] 存量奖励类积极分 expires_at 补正完成，处理 ${affected} 条`);
};
