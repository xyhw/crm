import { query, insert, getPool } from '../db.js';
import bcrypt from 'bcryptjs';

const CATEGORIES = [
  { name: '装修总包', icon: '🏗️', sort_order: 1 },
  { name: '弱电总包', icon: '🔌', sort_order: 2 },
  { name: '软装总包', icon: '🛋️', sort_order: 3 },
  { name: '酒店家具', icon: '🛏️', sort_order: 4 },
  { name: '酒店运营物资', icon: '🧴', sort_order: 5 },
  { name: '厨房设备', icon: '🍳', sort_order: 6 },
  { name: '照明灯具', icon: '💡', sort_order: 7 },
  { name: '布草布艺', icon: '🧺', sort_order: 8 },
  { name: '家电设备', icon: '📺', sort_order: 9 },
  { name: '其他', icon: '📦', sort_order: 10 },
];

const MEMBER_LEVELS = [
  { level_key: 'normal', name: '普通会员', purchase_discount: 1.00, commission_bonus: 0, purchase_rate_threshold: 0, invalid_rate_threshold: 100, helpful_rate_threshold: 0, activity_threshold: 0, free_audit: 0, mark_weight: 1, sort_order: 1 },
  { level_key: 'silver', name: '银牌会员', purchase_discount: 0.90, commission_bonus: 0.10, purchase_rate_threshold: 30, invalid_rate_threshold: 10, helpful_rate_threshold: 20, activity_threshold: 50, free_audit: 0, mark_weight: 1, sort_order: 2 },
  { level_key: 'gold', name: '金牌会员', purchase_discount: 0.80, commission_bonus: 0.20, purchase_rate_threshold: 50, invalid_rate_threshold: 5, helpful_rate_threshold: 40, activity_threshold: 100, free_audit: 1, mark_weight: 2, sort_order: 3 },
  { level_key: 'expert', name: '认证达人', purchase_discount: 0.70, commission_bonus: 0.30, purchase_rate_threshold: 70, invalid_rate_threshold: 3, helpful_rate_threshold: 60, activity_threshold: 200, free_audit: 1, mark_weight: 3, sort_order: 4 },
];

const SYSTEM_CONFIGS = [
  { config_key: 'register_gift_points', config_value: '10', config_type: 'number', description: '注册赠送积分' },
  { config_key: 'invite_reward_points', config_value: '5', config_type: 'number', description: '邀请奖励积分（双方各得）' },
  { config_key: 'platform_commission_rate', config_value: '0.20', config_type: 'number', description: '平台抽成比例' },
  { config_key: 'points_expire_days', config_value: '180', config_type: 'number', description: '奖励积分有效期（天）' },
  { config_key: 'invalid_threshold', config_value: '0.20', config_type: 'number', description: '无效判定阈值（购买量占比）' },
  { config_key: 'invalid_penalty_rate', config_value: '0.50', config_type: 'number', description: '无效惩罚扣除比例' },
  { config_key: 'invalid_ban_threshold', config_value: '3', config_type: 'number', description: '累计无效封号阈值' },
  { config_key: 'opportunity_price_min', config_value: '10', config_type: 'number', description: '商机定价下限（积分）' },
  { config_key: 'opportunity_price_max', config_value: '200', config_type: 'number', description: '商机定价上限（积分）' },
  { config_key: 'share_reward_points', config_value: '2', config_type: 'number', description: '进度分享奖励积分' },
  { config_key: 'helpful_reward_points', config_value: '1', config_type: 'number', description: '进度分享被标记有用奖励积分' },
  { config_key: 'points_recharge_limit', config_value: '10000', config_type: 'number', description: '单次充值上限（积分）' },
  { config_key: 'similarity_threshold', config_value: '0.80', config_type: 'number', description: '相似度检测阈值' },
  { config_key: 'credit_ban_threshold', config_value: '40', config_type: 'number', description: '信用分封禁阈值' },
  { config_key: 'credit_review_threshold', config_value: '60', config_type: 'number', description: '信用分审核阈值' },
  { config_key: 'points_mall_enabled', config_value: 'false', config_type: 'boolean', description: '积分商城开关' },
];

export async function seedDatabase() {
  const pool = await getPool();
  
  // 检查是否已有数据
  const [existing] = await pool.execute('SELECT COUNT(*) as count FROM opportunity_categories');
  if (existing[0].count > 0) {
    console.log('[seed] Database already seeded, skipping');
    return;
  }

  console.log('[seed] Seeding database...');

  // 插入分类
  for (const cat of CATEGORIES) {
    await insert('opportunity_categories', cat);
  }
  console.log('[seed] Categories seeded');

  // 插入等级配置
  for (const level of MEMBER_LEVELS) {
    await insert('member_levels', level);
  }
  console.log('[seed] Member levels seeded');

  // 插入系统配置
  for (const config of SYSTEM_CONFIGS) {
    await insert('system_configs', config);
  }
  console.log('[seed] System configs seeded');

  // 创建默认管理员
  // 生产环境必须通过 ADMIN_INIT_PASSWORD 设置强密码，否则使用默认密码并输出强制改密警告
  const initPassword = process.env.ADMIN_INIT_PASSWORD || 'admin123';
  const adminHash = await bcrypt.hash(initPassword, 10);
  await insert('admin_users', {
    username: 'admin',
    password_hash: adminHash,
    name: '超级管理员',
    phone: '13800000000',
    status: 'active',
  });
  if (process.env.ADMIN_INIT_PASSWORD) {
    console.log('[seed] Default admin created (password from ADMIN_INIT_PASSWORD)');
  } else {
    console.warn('[seed][SECURITY] Default admin created with DEFAULT password admin/admin123 — 请登录后台立即修改密码，或部署前设置 ADMIN_INIT_PASSWORD');
  }

  // 创建默认角色
  await insert('roles', { name: 'super_admin', description: '超级管理员' });
  await insert('roles', { name: 'operation', description: '运营管理员' });
  await insert('roles', { name: 'finance', description: '财务管理员' });
  await insert('roles', { name: 'support', description: '客服/助理' });
  console.log('[seed] Default roles created');

  // 绑定默认管理员到 super_admin 角色（角色体系防空转）
  const [adminRow] = await pool.execute("SELECT id FROM admin_users WHERE username = 'admin' LIMIT 1");
  const [superRole] = await pool.execute("SELECT id FROM roles WHERE name = 'super_admin' LIMIT 1");
  if (adminRow[0] && superRole[0]) {
    await pool.execute('INSERT IGNORE INTO admin_role_relations (admin_id, role_id) VALUES (?, ?)', [
      adminRow[0].id,
      superRole[0].id,
    ]);
    console.log('[seed] Default admin bound to super_admin role');
  }

  console.log('[seed] Database seeding completed');
}

// 如果直接运行此文件，执行种子
if (process.argv[1]?.endsWith('seed.js')) {
  seedDatabase().then(() => process.exit(0)).catch(console.error);
}
