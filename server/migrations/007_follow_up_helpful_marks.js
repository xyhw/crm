import { query } from '../db.js';

export const migrateFollowUpHelpfulMarks = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS follow_up_helpful_marks (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      share_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_share_user (share_id, user_id),
      INDEX idx_share_id (share_id),
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB
  `);
  console.log('[migration] follow_up_helpful_marks table ready');
};
