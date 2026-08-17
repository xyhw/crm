import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'hof_user',
  password: process.env.DB_PASS || 'hof_pass_2026',
  database: process.env.DB_NAME || 'hotel_order_follow',
  charset: 'utf8mb4',
};

export async function migrateOpportunityAddressWechat() {
  const conn = await mysql.createConnection(DB_CONFIG);
  try {
    const [cols] = await conn.execute('SHOW COLUMNS FROM opportunities LIKE "address"');
    if (cols.length === 0) {
      await conn.execute('ALTER TABLE opportunities ADD COLUMN address VARCHAR(200) NULL COMMENT \'具体地址\' AFTER city');
      console.log('[migration] opportunities.address column added');
    } else {
      console.log('[migration] opportunities.address already exists, skip');
    }

    const [cols2] = await conn.execute('SHOW COLUMNS FROM opportunities LIKE "wechat"');
    if (cols2.length === 0) {
      await conn.execute('ALTER TABLE opportunities ADD COLUMN wechat VARCHAR(50) NULL COMMENT \'微信号\' AFTER contact_phone');
      console.log('[migration] opportunities.wechat column added');
    } else {
      console.log('[migration] opportunities.wechat already exists, skip');
    }
  } finally {
    await conn.end();
  }
}

if (process.argv[1]?.endsWith('006_opportunity_address_wechat.js')) {
  migrateOpportunityAddressWechat().catch(console.error);
}
