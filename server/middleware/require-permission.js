import { query } from '../db.js';

/**
 * 后台权限点中间件：由 role_permissions 表驱动（requireRole 角色名的细粒度升级）。
 * 必须挂在 adminAuthRequired 之后（依赖 req.adminId / req.adminRoles）。
 *
 * - super_admin 直通
 * - 权限集按 adminId 缓存 60s；角色权限变更方需调用 invalidateAdminPermissionCache 失效
 */
const PERMISSION_CACHE_TTL = 60 * 1000;
const PERMISSION_CACHE_MAX = 10000;
const permissionCache = new Map(); // adminId -> { permissions: Set, expiresAt }

export function invalidateAdminPermissionCache(adminId) {
  if (adminId == null) permissionCache.clear();
  else permissionCache.delete(adminId);
}

export async function getAdminPermissions(adminId, roles) {
  const hit = permissionCache.get(adminId);
  const now = Date.now();
  if (hit && now < hit.expiresAt) return hit.permissions;

  let permissions = new Set();
  if (roles.length > 0) {
    const rows = await query(
      `SELECT DISTINCT rp.permission_key
       FROM role_permissions rp
       JOIN admin_role_relations arr ON arr.role_id = rp.role_id
       WHERE arr.admin_id = ?`,
      [adminId]
    );
    permissions = new Set(rows.map((r) => r.permission_key));
  }
  permissionCache.set(adminId, { permissions, expiresAt: now + PERMISSION_CACHE_TTL });
  if (permissionCache.size > PERMISSION_CACHE_MAX) permissionCache.clear();
  return permissions;
}

export function requirePermission(...perms) {
  return async (req, res, next) => {
    try {
      const roles = req.adminRoles || [];
      if (roles.includes('super_admin')) return next();
      if (perms.length === 0) return next();
      const permissions = await getAdminPermissions(req.adminId, roles);
      if (perms.some((p) => permissions.has(p))) return next();
      return res.status(403).json({ code: 403, message: '权限不足' });
    } catch (err) {
      return next(err);
    }
  };
}
