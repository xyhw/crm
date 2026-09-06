import { query } from '../db.js';
import { logger } from '../services/logger.js';

/**
 * 权限点回填 migration（幂等）：
 * role_permissions 表此前「只存不用」（requireRole 仅认角色名），本迁移将其激活：
 * 为「尚无任何权限配置」的内置角色写入默认权限集，使其与原 requireRole 挂载行为一致。
 * 已有权限配置的角色视为管理员刻意定制，不做覆盖。
 *
 * 权限集与 index.js 各挂载点的 requirePermission 映射对应：
 * - operation → 商机/用户/审核/分类标签/通知/Banner/公告/上传/导入/仪表盘
 * - finance   → 订单/积分/充值对账/财务/仪表盘
 * - support   → 不授予（与原行为一致：原 requireRole 白名单亦不含 support）
 * - super_admin → 直通，无需配置
 */
const DEFAULT_ROLE_PERMISSIONS = {
  operation: [
    'dashboard',
    'opportunities', 'opportunities.edit', 'opportunities.import', 'opportunities.status',
    'users', 'users.edit', 'users.points', 'users.credits',
    'audit', 'audit.approve',
    'categories', 'tags', 'notifications', 'upload', 'banners', 'announcements',
  ],
  finance: [
    'dashboard',
    'orders', 'points', 'recharge', 'finance',
  ],
};

export const migratePermissionBackfill = async () => {
  for (const [roleName, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const roles = await query('SELECT id FROM roles WHERE name = ?', [roleName]);
    const role = roles[0];
    if (!role) continue;

    const existing = await query('SELECT COUNT(*) AS cnt FROM role_permissions WHERE role_id = ?', [role.id]);
    if (existing[0].cnt > 0) {
      continue;
    }
    for (const key of permissions) {
      await query('INSERT IGNORE INTO role_permissions (role_id, permission_key) VALUES (?, ?)', [role.id, key]);
    }
    logger.info(`[migration] role permissions backfilled: ${roleName} (${permissions.length} keys)`);
  }
  logger.info('[migration] permission backfill ready');
};
