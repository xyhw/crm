/**
 * 账号级登录失败锁定：
 * 在 IP 级限流之外，对同一账号连续失败进行窗口计数，达到阈值即临时锁定。
 * 锁定基于 DB 持久化，跨进程/重启有效。
 */
import { query, queryOne } from '../db.js';
import { config } from '../config.js';

const WINDOW_SEC = config.rateLimit.accountLockWindowSec;
const THRESHOLD = config.rateLimit.accountLockThreshold;

/** 判断账号当前是否处于锁定状态 */
export async function isAccountLocked(userId) {
  const row = await queryOne(
    'SELECT COUNT(*) AS c FROM login_failures WHERE user_id = ? AND failed_at > DATE_SUB(NOW(), INTERVAL ? SECOND)',
    [userId, WINDOW_SEC]
  );
  return (row?.c || 0) >= THRESHOLD;
}

/** 记录一次登录失败 */
export async function recordLoginFailure(userId) {
  // 顺带清理该用户窗口外的历史记录，避免表无限增长
  await query('DELETE FROM login_failures WHERE user_id = ? AND failed_at <= DATE_SUB(NOW(), INTERVAL ? SECOND)', [
    userId,
    WINDOW_SEC,
  ]);
  await query('INSERT INTO login_failures (user_id) VALUES (?)', [userId]);
}

/** 登录成功后清零失败记录 */
export async function clearLoginFailures(userId) {
  await query('DELETE FROM login_failures WHERE user_id = ?', [userId]);
}