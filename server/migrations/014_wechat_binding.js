import { query } from '../db.js';

/**
 * 微信小程序绑定迁移（预留）：
 * 1. users 表追加 wechat_openid / wechat_unionid 字段
 * 2. wechat_openid 唯一索引（一个微信账号至多关联一个用户，防重复绑定）
 * 幂等：字段已存在则跳过 ALTER，索引存在则跳过 CREATE
 */
export const migrateWechatBinding = async () => {
  // 查询当前表结构，判断字段是否已存在
  const columns = await query('SHOW COLUMNS FROM users');

  const has = (name) => columns.some((c) => c.Field === name);

  if (!has('wechat_openid')) {
    await query(
      'ALTER TABLE users ADD COLUMN wechat_openid VARCHAR(64) NULL DEFAULT NULL'
    );
    console.log('[migration] users.wechat_openid added');
  } else {
    console.log('[migration] users.wechat_openid already exists, skip');
  }

  if (!has('wechat_unionid')) {
    await query(
      'ALTER TABLE users ADD COLUMN wechat_unionid VARCHAR(64) NULL DEFAULT NULL'
    );
    console.log('[migration] users.wechat_unionid added');
  } else {
    console.log('[migration] users.wechat_unionid already exists, skip');
  }

  // 唯一索引
  const indexes = await query('SHOW INDEX FROM users');
  const hasIndex = indexes.some((i) => i.Key_name === 'idx_users_wechat_openid');
  if (!hasIndex) {
    await query(
      'CREATE UNIQUE INDEX idx_users_wechat_openid ON users (wechat_openid)'
    );
    console.log('[migration] idx_users_wechat_openid created');
  } else {
    console.log('[migration] idx_users_wechat_openid already exists, skip');
  }
};