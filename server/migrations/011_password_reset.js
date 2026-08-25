import { query } from '../db.js';

export const migratePasswordReset = async () => {
  const [cols] = await query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'token_version'`
  );
  if (!cols) {
    await query('ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0');
    console.log('[migration] users.token_version added');
  }

  await query(`
    CREATE TABLE IF NOT EXISTS password_reset_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      code_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_user_id (user_id),
      KEY idx_expires (expires_at)
    )
  `);
  console.log('[migration] password_reset_codes table ready');
};
