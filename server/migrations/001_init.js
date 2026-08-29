import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'hof_user',
  password: process.env.DB_PASS || 'hof_pass_2026',
  database: process.env.DB_NAME || 'hotel_order_follow',
  charset: 'utf8mb4',
};

export async function createConnection() {
  return mysql.createConnection(DB_CONFIG);
}

export async function createPool() {
  return mysql.createPool({
    ...DB_CONFIG,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

export async function initDatabase() {
  const conn = await createConnection();
  
  const tables = [
    // 用户表
    `CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      phone VARCHAR(20) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      nickname VARCHAR(50) NOT NULL,
      avatar VARCHAR(500),
      company VARCHAR(100),
      category VARCHAR(50),
      bio TEXT,
      invite_code VARCHAR(20) UNIQUE,
      invited_by BIGINT UNSIGNED,
      status ENUM('active','banned') DEFAULT 'active',
      credit_score INT DEFAULT 100,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      INDEX idx_phone (phone),
      INDEX idx_invite_code (invite_code)
    ) ENGINE=InnoDB`,

    // 分类表
    `CREATE TABLE IF NOT EXISTS opportunity_categories (
      id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(50) NOT NULL,
      icon VARCHAR(100),
      sort_order INT DEFAULT 0,
      status ENUM('active','inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,

    // 标签表
    `CREATE TABLE IF NOT EXISTS opportunity_tags (
      id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_name (name)
    ) ENGINE=InnoDB`,

    // 商机表
    `CREATE TABLE IF NOT EXISTS opportunities (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      title VARCHAR(200) NOT NULL,
      category_id INT UNSIGNED NOT NULL,
      description_public TEXT,
      description_full TEXT,
      contact_name VARCHAR(50),
      contact_phone VARCHAR(30),
      wechat VARCHAR(50) COMMENT '微信号',
      city VARCHAR(50),
      address VARCHAR(200) COMMENT '具体地址',
      hotel_name VARCHAR(100),
      stage VARCHAR(50),
      price INT NOT NULL COMMENT '积分定价',
      status ENUM('active','inactive','invalid') DEFAULT 'active',
      invalid_mark_count INT DEFAULT 0,
      purchase_count INT DEFAULT 0,
      view_count INT DEFAULT 0,
      valid_until DATE,
      similarity_hash VARCHAR(64),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (category_id) REFERENCES opportunity_categories(id),
      INDEX idx_user_id (user_id),
      INDEX idx_category_id (category_id),
      INDEX idx_status (status),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB`,

    // 商机标签关联表
    `CREATE TABLE IF NOT EXISTS opportunity_tag_relations (
      opportunity_id BIGINT UNSIGNED NOT NULL,
      tag_id INT UNSIGNED NOT NULL,
      PRIMARY KEY (opportunity_id, tag_id),
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES opportunity_tags(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`,

    // 无效标记表
    `CREATE TABLE IF NOT EXISTS opportunity_invalid_marks (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      opportunity_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      reason ENUM('contact_invalid','info_fake','duplicate','other') NOT NULL,
      reason_text TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE KEY uk_opp_user (opportunity_id, user_id)
    ) ENGINE=InnoDB`,

    // 订单表
    `CREATE TABLE IF NOT EXISTS orders (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      opportunity_id BIGINT UNSIGNED NOT NULL,
      original_price INT NOT NULL,
      discount_rate DECIMAL(4,2) NOT NULL DEFAULT 1.00,
      actual_price INT NOT NULL COMMENT '实付积分',
      platform_commission INT NOT NULL,
      seller_income INT NOT NULL,
      status ENUM('paid','refunded') DEFAULT 'paid',
      refunded_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id),
      UNIQUE KEY uk_user_opp (user_id, opportunity_id),
      INDEX idx_user_id (user_id),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB`,

    // 积分账户表
    `CREATE TABLE IF NOT EXISTS points_accounts (
      user_id BIGINT UNSIGNED PRIMARY KEY,
      balance INT DEFAULT 0,
      total_recharged INT DEFAULT 0,
      total_consumed INT DEFAULT 0,
      total_expired INT DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB`,

    // 积分流水表
    `CREATE TABLE IF NOT EXISTS points_logs (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      delta INT NOT NULL COMMENT '正为获得负为消耗',
      balance_after INT NOT NULL,
      source_type ENUM('register_gift','invite_gift','purchase_income','commission',
                       'reward','consume','expire','recharge','admin_adjust','refund') NOT NULL,
      source_id BIGINT UNSIGNED,
      source_title VARCHAR(200),
      expires_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      INDEX idx_user_id (user_id),
      INDEX idx_source_type (source_type),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB`,

    // 分佣结算表
    `CREATE TABLE IF NOT EXISTS commission_settlements (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      order_id BIGINT UNSIGNED NOT NULL,
      seller_id BIGINT UNSIGNED NOT NULL,
      order_amount INT NOT NULL,
      platform_rate DECIMAL(4,2) NOT NULL,
      platform_commission INT NOT NULL,
      seller_income INT NOT NULL,
      level_bonus INT DEFAULT 0,
      status ENUM('paid','reversed') DEFAULT 'paid',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (seller_id) REFERENCES users(id),
      INDEX idx_seller_id (seller_id)
    ) ENGINE=InnoDB`,

    // 个人CRM表
    `CREATE TABLE IF NOT EXISTS crm_opportunities (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      opportunity_id BIGINT UNSIGNED,
      source ENUM('purchased','manual') DEFAULT 'purchased',
      status ENUM('pending','following','closed','abandoned') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id),
      UNIQUE KEY user_opportunity (user_id, opportunity_id)
    ) ENGINE=InnoDB`,

    // 私有跟进表
    `CREATE TABLE IF NOT EXISTS follow_ups (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      crm_opportunity_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      status ENUM('initial_contact','interested','negotiating','closed','invalid') DEFAULT 'initial_contact',
      content_private TEXT COMMENT '私有跟进内容',
      next_follow_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (crm_opportunity_id) REFERENCES crm_opportunities(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB`,

    // 进度分享表
    `CREATE TABLE IF NOT EXISTS follow_up_shares (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      opportunity_id BIGINT UNSIGNED NOT NULL,
      follow_up_id BIGINT UNSIGNED,
      status ENUM('initial_contact','interested','negotiating','closed','invalid') NOT NULL,
      summary VARCHAR(500),
      helpful_count INT DEFAULT 0,
      report_count INT DEFAULT 0,
      audit_status ENUM('pending','approved','rejected') DEFAULT 'pending',
      audit_reason VARCHAR(200),
      audit_admin_id BIGINT UNSIGNED,
      is_anonymous TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id),
      INDEX idx_opportunity_id (opportunity_id),
      INDEX idx_audit_status (audit_status)
    ) ENGINE=InnoDB`,

    // 会员等级统计表
    `CREATE TABLE IF NOT EXISTS user_level_stats (
      user_id BIGINT UNSIGNED PRIMARY KEY,
      level ENUM('normal','silver','gold','expert') DEFAULT 'normal',
      purchase_rate DECIMAL(5,2) DEFAULT 0,
      invalid_rate DECIMAL(5,2) DEFAULT 0,
      helpful_rate DECIMAL(5,2) DEFAULT 0,
      activity_score INT DEFAULT 0,
      composite_score DECIMAL(5,2) DEFAULT 0,
      purchased_opportunities INT DEFAULT 0,
      total_opportunities INT DEFAULT 0,
      invalid_opportunities INT DEFAULT 0,
      total_shares INT DEFAULT 0,
      helpful_shares INT DEFAULT 0,
      last_calculated_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB`,

    // 信用分记录表
    `CREATE TABLE IF NOT EXISTS user_credits (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      credit_score INT NOT NULL,
      change_amount INT NOT NULL,
      change_reason VARCHAR(200) NOT NULL,
      source_type ENUM('invalid_mark','share_report','account_report','purchase',
                       'share_helpful','weekly_active','admin_adjust') NOT NULL,
      admin_id BIGINT UNSIGNED,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB`,

    // 邀请记录表
    `CREATE TABLE IF NOT EXISTS invitations (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      inviter_id BIGINT UNSIGNED NOT NULL,
      invitee_id BIGINT UNSIGNED,
      invite_code VARCHAR(20) NOT NULL,
      status ENUM('pending','completed') DEFAULT 'pending',
      inviter_reward INT DEFAULT 0,
      invitee_reward INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      FOREIGN KEY (inviter_id) REFERENCES users(id),
      FOREIGN KEY (invitee_id) REFERENCES users(id)
    ) ENGINE=InnoDB`,

    // 等级配置表
    `CREATE TABLE IF NOT EXISTS member_levels (
      id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      level_key ENUM('normal','silver','gold','expert') UNIQUE NOT NULL,
      name VARCHAR(50) NOT NULL,
      purchase_discount DECIMAL(3,2) NOT NULL DEFAULT 1.00,
      commission_bonus DECIMAL(3,2) NOT NULL DEFAULT 0,
      purchase_rate_threshold DECIMAL(5,2) NOT NULL,
      invalid_rate_threshold DECIMAL(5,2) NOT NULL,
      helpful_rate_threshold DECIMAL(5,2) NOT NULL,
      activity_threshold INT NOT NULL,
      free_audit TINYINT(1) DEFAULT 0,
      mark_weight INT DEFAULT 1,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,

    // 系统配置表
    `CREATE TABLE IF NOT EXISTS system_configs (
      config_key VARCHAR(100) PRIMARY KEY,
      config_value TEXT NOT NULL,
      config_type ENUM('string','number','boolean','json') DEFAULT 'string',
      description VARCHAR(200),
      updated_by BIGINT UNSIGNED,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,

    // Banner表
    `CREATE TABLE IF NOT EXISTS banners (
      id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(100) NOT NULL,
      image_url VARCHAR(500),
      link_url VARCHAR(500),
      sort_order INT DEFAULT 0,
      status ENUM('active','inactive') DEFAULT 'active',
      start_at TIMESTAMP NULL,
      end_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,

    // 通知表
    `CREATE TABLE IF NOT EXISTS notifications (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      type ENUM('system','trade','interaction') NOT NULL,
      title VARCHAR(100) NOT NULL,
      content TEXT,
      is_read TINYINT(1) DEFAULT 0,
      related_type VARCHAR(50),
      related_id BIGINT UNSIGNED,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      INDEX idx_user_id (user_id),
      INDEX idx_is_read (is_read)
    ) ENGINE=InnoDB`,

    // 管理员表
    `CREATE TABLE IF NOT EXISTS admin_users (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(50),
      phone VARCHAR(20),
      status ENUM('active','inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,

    // 角色表
    `CREATE TABLE IF NOT EXISTS roles (
      id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(50) UNIQUE NOT NULL,
      description VARCHAR(200),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,

    // 管理员角色关联表
    `CREATE TABLE IF NOT EXISTS admin_role_relations (
      admin_id BIGINT UNSIGNED NOT NULL,
      role_id INT UNSIGNED NOT NULL,
      PRIMARY KEY (admin_id, role_id),
      FOREIGN KEY (admin_id) REFERENCES admin_users(id),
      FOREIGN KEY (role_id) REFERENCES roles(id)
    ) ENGINE=InnoDB`,

    // 角色权限表
    `CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INT UNSIGNED NOT NULL,
      permission_key VARCHAR(100) NOT NULL,
      PRIMARY KEY (role_id, permission_key),
      FOREIGN KEY (role_id) REFERENCES roles(id)
    ) ENGINE=InnoDB`,

    // 操作日志表
    `CREATE TABLE IF NOT EXISTS operation_logs (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      admin_id BIGINT UNSIGNED,
      action VARCHAR(100) NOT NULL,
      target_type VARCHAR(50),
      target_id BIGINT UNSIGNED,
      detail TEXT,
      ip VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_admin_id (admin_id),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB`,

    // 上传文件表
    `CREATE TABLE IF NOT EXISTS upload_files (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT UNSIGNED,
      original_name VARCHAR(200) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_size INT,
      mime_type VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB`,
  ];

  for (const sql of tables) {
    await conn.execute(sql);
  }

  await conn.end();
  console.log('[migration] All tables created successfully');
}

// 如果直接运行此文件，执行迁移
if (process.argv[1]?.endsWith('001_init.js')) {
  initDatabase().catch(console.error);
}
