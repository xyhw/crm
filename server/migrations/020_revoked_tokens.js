import { query } from '../db.js';

/**
 * token 吊销表 migration（幂等）：
 * 服务端登出 / token 吊销依赖：登出时将 token 的 jti 写入本表（expires_at = token 过期时间），
 * 认证中间件查本表拒绝已吊销 token；过期行由 scheduler 夜清理。
 * jti 由 auth.js signToken/signRefreshToken 与管理员登录签发时生成（randomUUID）。
 */
export const migrateRevokedTokens = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS revoked_tokens (
      jti VARCHAR(64) PRIMARY KEY COMMENT 'token 的 jti 声明',
      user_id BIGINT DEFAULT NULL COMMENT '关联用户/管理员 id（审计用）',
      token_type VARCHAR(20) NOT NULL DEFAULT 'access' COMMENT 'access/refresh/admin',
      expires_at DATETIME NOT NULL COMMENT 'token 过期时间，过期行可清理',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_revoked_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='已吊销 token（服务端登出）'
  `);
  console.log('[migration] revoked_tokens ensured');
};
