import jwt from 'jsonwebtoken';
import { queryOne } from './db.js';

const SECRET = process.env.JWT_SECRET || 'hotel-order-follow-dev-secret-2026';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'hotel-order-follow-refresh-secret-2026';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-secret-2026';

export function signToken(user) {
  return jwt.sign({ id: user.id, type: 'user' }, SECRET, { expiresIn: '7d' });
}

export function signRefreshToken(user) {
  return jwt.sign({ id: user.id, type: 'user' }, REFRESH_SECRET, { expiresIn: '30d' });
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
  
  // 检查用户是否存在且状态正常
  const user = await queryOne('SELECT id, status FROM users WHERE id = ? AND deleted_at IS NULL', [payload.id]);
  if (!user || user.status === 'banned') {
    return res.status(401).json({ code: 401, message: '账号已被禁用' });
  }
  
  req.userId = payload.id;
  next();
}

export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = token ? verifyToken(token) : null;
  
  if (payload && payload.type === 'user') {
    const user = await queryOne('SELECT id, status FROM users WHERE id = ? AND deleted_at IS NULL', [payload.id]);
    if (user && user.status === 'active') {
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
    req.adminId = payload.id;
    req.adminRoles = payload.roles || [];
    next();
  } catch {
    return res.status(401).json({ code: 401, message: '登录已过期' });
  }
}
