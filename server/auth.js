import jwt from 'jsonwebtoken';
import { queryOne, query } from './db.js';
import { config } from './config.js';

const SECRET = config.jwtSecret;
const REFRESH_SECRET = config.refreshSecret;
const ADMIN_SECRET = config.adminSecret;

// ---------------------------------------------------------------------------
// 鉴权短 TTL 缓存：避免每个请求都查 1-2 次库（用户状态/令牌版本、管理员状态/角色）。
// 失效钩子：改密/重置密码、封禁/解封、管理员编辑与角色调整时调用 invalidate*，
// 未覆盖的直改库场景最多滞后 TTL 窗口（60s），属可接受代价。
// ---------------------------------------------------------------------------
const AUTH_CACHE_TTL = 60 * 1000;
const AUTH_CACHE_MAX = 10000;
const userAuthCache = new Map();
const adminAuthCache = new Map();
const adminRolesCache = new Map();

export function invalidateUserAuthCache(userId) {
  if (userId == null) userAuthCache.clear();
  else userAuthCache.delete(userId);
}

export function invalidateAdminAuthCache(adminId) {
  if (adminId == null) {
    adminAuthCache.clear();
    adminRolesCache.clear();
  } else {
    adminAuthCache.delete(adminId);
    adminRolesCache.delete(adminId);
  }
}

async function getCached(map, key, loader) {
  const hit = map.get(key);
  const now = Date.now();
  if (hit && now < hit.expiresAt) return hit.value;
  const value = await loader();
  map.set(key, { value, expiresAt: now + AUTH_CACHE_TTL });
  if (map.size > AUTH_CACHE_MAX) map.clear();
  return value;
}

function getActiveUser(userId) {
  return getCached(userAuthCache, userId, () =>
    queryOne('SELECT id, status, token_version FROM users WHERE id = ? AND deleted_at IS NULL', [userId])
  );
}

function getActiveAdmin(adminId) {
  return getCached(adminAuthCache, adminId, () =>
    queryOne('SELECT id FROM admin_users WHERE id = ? AND status = "active"', [adminId])
  );
}

function getAdminRoles(adminId) {
  return getCached(adminRolesCache, adminId, async () => {
    const roleRows = await query(
      `SELECT r.name FROM roles r
       JOIN admin_role_relations arr ON r.id = arr.role_id
       WHERE arr.admin_id = ?`,
      [adminId]
    );
    return roleRows.map((r) => r.name);
  });
}

export function signToken(user) {
  return jwt.sign(
    { id: user.id, type: 'user', tok_version: user.token_version || 0 },
    SECRET,
    { expiresIn: '7d' }
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { id: user.id, type: 'user', tok_version: user.token_version || 0 },
    REFRESH_SECRET,
    { expiresIn: '30d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch {
    return null;
  }
}

export async function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = token ? verifyToken(token) : null;
  
  if (!payload || payload.type !== 'user') {
    return res.status(401).json({ code: 401, message: '未登录或登录已过期' });
  }
  
  // 检查用户是否存在且状态正常（60s TTL 缓存，改密/封禁路径主动失效）
  const user = await getActiveUser(payload.id);
  if (!user || user.status === 'banned') {
    return res.status(401).json({ code: 401, message: '账号已被禁用' });
  }

  // token 版本不匹配（密码重置/封禁后已作废），拒绝
  if (payload.tok_version !== user.token_version) {
    return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
  }
  
  req.userId = payload.id;
  next();
}

export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = token ? verifyToken(token) : null;
  
  if (payload && payload.type === 'user') {
    const user = await getActiveUser(payload.id);
    if (user && user.status === 'active' && payload.tok_version === user.token_version) {
      req.userId = payload.id;
    }
  }
  next();
}

export async function adminAuthRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ code: 401, message: '未登录' });
  }

  try {
    const payload = jwt.verify(token, ADMIN_SECRET);
    if (payload.type !== 'admin') {
      return res.status(401).json({ code: 401, message: '权限不足' });
    }
    // 校验管理员账号存在且未被禁用（防止禁用后 token 在有效期内继续使用）；60s TTL 缓存
    const admin = await getActiveAdmin(payload.id);
    if (!admin) {
      return res.status(401).json({ code: 401, message: '账号已被禁用或不存在' });
    }
    req.adminId = payload.id;
    // 角色以数据库实时查询为准（兼容旧 token 无 roles 字段，且角色变更即时生效；60s TTL 缓存）
    req.adminRoles = await getAdminRoles(payload.id);
    next();
  } catch {
    return res.status(401).json({ code: 401, message: '登录已过期' });
  }
}
