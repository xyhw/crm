import mysql from 'mysql2/promise';

/**
 * 测试用数据库连接：凭据可被环境变量覆盖（CI 注入），默认值与本地开发约定一致。
 * 与 server/config.js 使用同名 DB_* 环境变量，CI 中一套变量同时供服务与测试使用。
 */
export const TEST_DB = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'hof_user',
  password: process.env.DB_PASS || 'hof_pass_2026',
  database: process.env.DB_NAME || 'hotel_order_follow',
};

export async function createTestPool() {
  return mysql.createPool(TEST_DB);
}
