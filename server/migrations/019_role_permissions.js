import { query } from '../db.js';

/**
 * 角色权限种子 migration（幂等）：
 * 为 4 个默认角色补 role_permissions 明细，与 index.js 的 requireRole 路由映射对齐：
 * - super_admin：全部权限点
 * - operation（运营）：商机 / 用户 / 审核 / 仪表盘
 * - finance（财务）：订单 / 积分 / 仪表盘
 * - support（客服）：仪表盘
 * 采用 INSERT IGNORE，已分配的角色权限不受影响（整体覆盖仅发生在角色管理页保存时）。
 */
const ROLE_PERMISSION_MAP = {
  super_admin: [
    'dashboard',
    'opportunities',
    'opportunities.edit',
    'opportunities.import',
    'opportunities.status',
    'users',
    'users.edit',
    'users.ban',
    'users.points',
    'users.credits',
    'orders',
    'points',
    'levels',
    'levels.edit',
    'configs',
    'configs.edit',
    'audit',
    'audit.approve',
    'audit_logs',
    'roles',
    'roles.edit',
    'admins',
    'admins.edit',
  ],
  operation: [
    'dashboard',
    'opportunities',
    'opportunities.edit',
    'opportunities.import',
    'opportunities.status',
    'users',
    'users.edit',
    'users.ban',
    'users.points',
    'users.credits',
    'audit',
    'audit.approve',
  ],
  finance: ['dashboard', 'orders', 'points'],
  support: ['dashboard'],
};

export const migrateRolePermissions = async () => {
  for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSION_MAP)) {
    for (const key of permissionKeys) {
      await query(
        `INSERT IGNORE INTO role_permissions (role_id, permission_key)
         SELECT id, ? FROM roles WHERE name = ?`,
        [key, roleName]
      );
    }
  }
  console.log('[migration] role_permissions seeded for default roles');
};
