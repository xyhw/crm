import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'hof_user',
  password: process.env.DB_PASS || 'hof_pass_2026',
  database: process.env.DB_NAME || 'hotel_order_follow',
  charset: 'utf8mb4',
};

export async function migrateAnnouncements() {
  const conn = await mysql.createConnection(DB_CONFIG);
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(100) NOT NULL,
        content TEXT,
        media_type ENUM('text','image','video','mixed') DEFAULT 'text',
        media_url VARCHAR(500),
        link_url VARCHAR(500),
        is_top TINYINT(1) DEFAULT 0,
        sort_order INT DEFAULT 0,
        status ENUM('active','inactive') DEFAULT 'active',
        start_at TIMESTAMP NULL,
        end_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB
    `);
    console.log('[migration] announcements table ready');
  } finally {
    await conn.end();
  }
}

// 如果直接运行此文件，执行迁移
if (process.argv[1]?.endsWith('003_announcements.js')) {
  migrateAnnouncements().catch(console.error);
}
