import { query } from '../db.js';

export async function migrateP1Indexes() {
  const statements = [
    // 公告用户端列表：status=active + 时间范围 + is_top/sort_order
    'CREATE INDEX idx_announcements_status_top ON announcements (status, is_top DESC, sort_order ASC, created_at DESC)',

    // 审计日志：按 action/target_type 过滤
    'CREATE INDEX idx_operation_logs_action ON operation_logs (action)',
    'CREATE INDEX idx_operation_logs_target_type ON operation_logs (target_type)',

    // Banner 用户端列表：status + sort_order
    'CREATE INDEX idx_banners_status_sort ON banners (status, sort_order ASC, created_at DESC)',

    // 通知列表：按 user + 未读优先 + 时间倒序
    'CREATE INDEX idx_notifications_user_read ON notifications (user_id, is_read, created_at DESC)',

    // 上传文件：按时间排序
    'CREATE INDEX idx_upload_files_created_at ON upload_files (created_at)',

    // 用户管理列表：按 status 过滤 + 时间排序
    'CREATE INDEX idx_users_status_created ON users (status, created_at DESC)',
  ];

  for (const sql of statements) {
    try {
      await query(sql);
      console.log(`[migration] ${sql.split('(')[0].trim()} applied`);
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log(`[migration] index already exists, skip: ${sql.split('(')[0].trim()}`);
      } else {
        console.error(`[migration] failed: ${sql}`, error.message);
      }
    }
  }
}
