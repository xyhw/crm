import { query } from '../db.js';

/**
 * 管理后台标签接口排序修复：
 * admin/tag.routes.js 查询 ORDER BY sort_order、新增/更新写 sort_order，
 * 但 001_init 建表未包含该列，导致 /api/v1/admin/tags 返回 500「获取标签失败」。
 * 幂等：列已存在则跳过 ALTER。
 */
export const migrateOpportunityTagsSortOrder = async () => {
  const [cols] = await query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'opportunity_tags' AND COLUMN_NAME = 'sort_order'`
  );
  if (!cols) {
    await query('ALTER TABLE opportunity_tags ADD COLUMN sort_order INT NOT NULL DEFAULT 0');
    console.log('[migration] opportunity_tags.sort_order added');
  } else {
    console.log('[migration] opportunity_tags.sort_order already exists, skip');
  }
};