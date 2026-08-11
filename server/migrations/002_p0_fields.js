import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'hof_user',
  password: process.env.DB_PASS || 'hof_pass_2026',
  database: process.env.DB_NAME || 'hotel_order_follow',
  charset: 'utf8mb4',
};

const FOLLOW_UP_STATUS_ENUM = ['call_no_answer', 'added_wechat', 'interested', 'quoting', 'negotiating', 'closed', 'abandoned'];

async function columnExists(conn, table, column) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [DB_CONFIG.database, table, column]
  );
  return rows[0].cnt > 0;
}

async function addColumnIfMissing(conn, table, column, definition) {
  if (await columnExists(conn, table, column)) {
    console.log(`[migration] ${table}.${column} already exists, skip`);
    return;
  }
  await conn.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  console.log(`[migration] ${table}.${column} added`);
}

async function migrateFollowUpStatusEnums(conn) {
  const tables = ['follow_ups', 'follow_up_shares'];

  for (const table of tables) {
    // 第一步：先扩为临时枚举（新7值 + 旧值），避免严格模式下写入越界值
    const tempEnum = ['call_no_answer', 'added_wechat', 'interested', 'quoting', 'negotiating', 'closed', 'abandoned', 'initial_contact', 'invalid'];
    const tempEnumSql = tempEnum.map((s) => `'${s}'`).join(', ');
    await conn.execute(`ALTER TABLE ${table} MODIFY COLUMN status ENUM(${tempEnumSql}) NOT NULL`);

    // 第二步：映射旧值 -> 新值
    await conn.execute(`UPDATE ${table} SET status = 'call_no_answer' WHERE status = 'initial_contact'`);
    await conn.execute(`UPDATE ${table} SET status = 'abandoned' WHERE status = 'invalid'`);

    // 第三步：收缩为最终 7 值枚举
    const enumSql = FOLLOW_UP_STATUS_ENUM.map((s) => `'${s}'`).join(', ');
    if (table === 'follow_ups') {
      await conn.execute(
        `ALTER TABLE ${table} MODIFY COLUMN status ENUM(${enumSql}) NOT NULL DEFAULT 'call_no_answer'`
      );
    } else {
      await conn.execute(
        `ALTER TABLE ${table} MODIFY COLUMN status ENUM(${enumSql}) NOT NULL`
      );
    }
    console.log(`[migration] ${table}.status enum expanded to 7 values`);
  }
}

export async function migrateP0Fields() {
  const conn = await mysql.createConnection(DB_CONFIG);
  try {
    // users: email / qualifications / cases
    await addColumnIfMissing(conn, 'users', 'email', `VARCHAR(100) NULL`);
    await addColumnIfMissing(conn, 'users', 'qualifications', `TEXT NULL COMMENT '专业资质，换行分隔'`);
    await addColumnIfMissing(conn, 'users', 'cases', `TEXT NULL COMMENT '典型案例，换行分隔'`);

    // opportunities: brand / attachments
    await addColumnIfMissing(conn, 'opportunities', 'brand', `VARCHAR(100) NULL COMMENT '品牌/酒店名称'`);
    await addColumnIfMissing(conn, 'opportunities', 'attachments', `TEXT NULL COMMENT '图纸附件 URL 数组(JSON)'`);

    // follow_ups / follow_up_shares: status 7 枚举
    await migrateFollowUpStatusEnums(conn);

    console.log('[migration] 002_p0_fields applied successfully');
  } finally {
    await conn.end();
  }
}

// 如果直接运行此文件，执行迁移
if (process.argv[1]?.endsWith('002_p0_fields.js')) {
  migrateP0Fields().catch(console.error);
}
