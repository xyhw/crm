import { query, queryOne } from '../db.js';

/**
 * 安全加固 migration：
 * 1. login_failures 表：账号级登录失败计数（配合连续失败锁定）
 * 2. 确保后台角色存在（super_admin 等），幂等
 * 3. 默认管理员绑定 super_admin（防角色体系空转）
 */
export const migrateSecurityGuards = async () => {
  // 1. 登录失败记录表
  await query(`
    CREATE TABLE IF NOT EXISTS login_failures (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      failed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_user_time (user_id, failed_at)
    )
  `);
  console.log('[migration] login_failures table ready');

  // 2. 确保后台角色存在（name 有 UNIQUE 约束，INSERT IGNORE 幂等）
  const roles = [
    ['super_admin', '超级管理员'],
    ['operation', '运营管理员'],
    ['finance', '财务管理员'],
    ['support', '客服/助理'],
  ];
  for (const [name, desc] of roles) {
    await query('INSERT IGNORE INTO roles (name, description) VALUES (?, ?)', [name, desc]);
  }
  console.log('[migration] roles ensured');

  // 3. 默认管理员（username=admin）若无任何角色，绑定 super_admin
  const admins = await query("SELECT id FROM admin_users WHERE username = 'admin'");
  for (const admin of admins) {
    const bound = await queryOne(
      'SELECT 1 FROM admin_role_relations r JOIN roles role ON r.role_id = role.id WHERE r.admin_id = ? AND role.name = ?',
      [admin.id, 'super_admin']
    );
    if (!bound) {
      await query(
        'INSERT IGNORE INTO admin_role_relations (admin_id, role_id) SELECT ?, id FROM roles WHERE name = ?',
        [admin.id, 'super_admin']
      );
    }
  }
  console.log('[migration] default admin roles ensured');
};