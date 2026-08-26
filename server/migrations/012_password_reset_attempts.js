import { query } from '../db.js';

export const migratePasswordResetAttempts = async () => {
  const [cols] = await query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'password_reset_codes' AND COLUMN_NAME = 'attempts'`
  );
  if (!cols) {
    await query('ALTER TABLE password_reset_codes ADD COLUMN attempts INT NOT NULL DEFAULT 0');
    console.log('[migration] password_reset_codes.attempts added');
  }
};
