import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { queryOne, query } from './db.js';
import { config } from './config.js';

const SECRET = config.jwtSecret;
const REFRESH_SECRET = config.refreshSecret;
const ADMIN_SECRET = config.adminSecret;

/** 登出/吊销：检查 token 的 jti 是否已吊销 */
export async function isTokenRevoked(jti) {
  if (!jti) return false;
  const row = await queryOne('SELECT 1 FROM revoked_tokens WHERE jti = ?', [jti]);
  return Boolean(row);
}

/** 吊销 token：写入吊销表，过期后可被夜清理 */
export async function revokeToken({ jti, userId = null, tokenType = 'access', expiresAt }) {
  if (!jti || !expiresAt) return;
  await query(
    'INSERT IGNORE INTO revoked_tokens (jti, user_id, token_type, expires_at) VALUES (?, ?, ?, ?)',
    [jti, userId, tokenType, expiresAt]
  );
}

export function signToken(user) {
  return jwt.sign(
    { id: user.id, type: 'user', tok_version: user.token_version || 0, jti: randomUUID() },
    SECRET,
    { expiresIn: '7d' }
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { id: user.id, type: 'user', tok_version: user.token_version || 0, jti: randomUUID() },
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
  
  // 已吊销（登出）的 token 拒绝
  if (await isTokenRevoked(payload.jti)) {
    return res.status(401).json({ code: 401, message: '登录已失效，请重新登录' });
  }
  
  // 检查用户是否存在且状态正常
  const user = await queryOne('SELECT id, status, token_version FROM users WHERE id = ? AND deleted_at IS NULL', [payload.id]);
  if (!user || user.status === 'banned') {
    return res.status(401).json({ code: 401, message: '账号已被禁用' });
  }

  // token 版本不匹配（密码重置/封禁后已作废），拒绝
  if (payload.tok_version !== user.token_version) {
    return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
  }
  
  req.userId = payload.id;
  req.authPayload = payload;
  next();
}

export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = token ? verifyToken(token) : null;
  
  if (payload && payload.type === 'user' && !(await isTokenRevoked(payload.jti))) {
    const user = await queryOne('SELECT id, status, token_version FROM users WHERE id = ? AND deleted_at IS NULL', [payload.id]);
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
    // 已吊销（登出）的管理 token 拒绝
    if (await isTokenRevoked(payload.jti)) {
      return res.status(401).json({ code: 401, message: '登录已失效，请重新登录' });
    }
    // 校验管理员账号存在且未被禁用（防止禁用后 token 在有效期内继续使用）
    const admin = await queryOne('SELECT id FROM admin_users WHERE id = ? AND status = "active"', [payload.id]);
    if (!admin) {
      return res.status(401).json({ code: 401, message: '账号已被禁用或不存在' });
    }
    req.adminId = payload.id;
    req.adminPayload = payload;
    // 角色以数据库实时查询为准（兼容旧 token 无 roles 字段，且角色变更即时生效）
    const roleRows = await query(
      `SELECT r.name FROM roles r
       JOIN admin_role_relations arr ON r.id = arr.role_id
       WHERE arr.admin_id = ?`,
      [payload.id]
    );
    req.adminRoles = roleRows.map(r => r.name);
    next();
  } catch {
    return res.status(401).json({ code: 401, message: '登录已过期' });
  }
}
