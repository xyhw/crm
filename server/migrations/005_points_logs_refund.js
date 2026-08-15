import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'hof_user',
  password: process.env.DB_PASS || 'hof_pass_2026',
  database: process.env.DB_NAME || 'hotel_order_follow',
  charset: 'utf8mb4',
};

export async function migratePointsLogsRefund() {
  const conn = await mysql.createConnection(DB_CONFIG);
  try {
    await conn.execute(
      `ALTER TABLE points_logs
       MODIFY COLUMN source_type ENUM(
         'register_gift','invite_gift','purchase_income','commission',
         'reward','consume','expire','recharge','admin_adjust','refund'
       ) NOT NULL`
    );
    console.log('[migration] points_logs.source_type enum added refund');
  } finally {
    await conn.end();
  }
}

if (process.argv[1]?.endsWith('005_points_logs_refund.js')) {
  migratePointsLogsRefund().catch(console.error);
}
