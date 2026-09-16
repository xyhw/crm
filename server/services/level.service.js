import { query, queryOne } from '../db.js';

const CACHE_PREFIX = 'level:';
const CONFIG_CACHE_PREFIX = 'level_config:';
const CACHE_TTL = 3600;

function getCache(key) {
  try {
    if (global.levelCache) {
      const entry = global.levelCache.get(key);
      if (entry && Date.now() < entry.expires) {
        return entry.value;
      }
    }
  } catch {}
  return null;
}

function setCache(key, value, ttl = CACHE_TTL) {
  try {
    if (!global.levelCache) global.levelCache = new Map();
    global.levelCache.set(key, { value, expires: Date.now() + ttl * 1000 });
  } catch {}
}

function delCache(key) {
  try {
    if (global.levelCache) global.levelCache.delete(key);
  } catch {}
}

export async function getUserLevel(userId) {
  const cacheKey = CACHE_PREFIX + userId;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const stats = await queryOne(
    'SELECT level FROM user_level_stats WHERE user_id = ?',
    [userId]
  );
  const level = stats?.level || 'normal';
  setCache(cacheKey, level);
  return level;
}

export async function getLevelConfig(levelKey) {
  const cacheKey = CONFIG_CACHE_PREFIX + levelKey;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const config = await queryOne(
    'SELECT * FROM member_levels WHERE level_key = ?',
    [levelKey]
  );
  if (config) setCache(cacheKey, config);
  return config;
}

export async function getAllLevelConfigs() {
  const cacheKey = CONFIG_CACHE_PREFIX + 'all';
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const configs = await query('SELECT * FROM member_levels ORDER BY sort_order');
  setCache(cacheKey, configs);
  return configs;
}

export function clearUserLevelCache(userId) {
  delCache(CACHE_PREFIX + userId);
}

// P0-3：登录打卡（活跃度「登录频率」指标 + 周活跃加分数据源），同一用户同一天只记一条
export async function recordLoginDay(userId) {
  if (!userId) return;
  try {
    await query(
      'INSERT IGNORE INTO user_login_days (user_id, login_date) VALUES (?, CURDATE())',
      [userId]
    );
  } catch (err) {
    console.error('[level.service] 登录打卡失败:', err.message);
  }
}

export function clearLevelConfigCache() {
  if (global.levelCache) {
    for (const key of global.levelCache.keys()) {
      if (key.startsWith(CONFIG_CACHE_PREFIX)) {
        global.levelCache.delete(key);
      }
    }
  }
}

export async function getCommissionRate(userId) {
  // P0-2：分佣比例直接取等级配置 member_levels.commission_rate（普通70/银牌75/金牌80/达人85，后台可配）
  const level = await getUserLevel(userId);
  const config = await getLevelConfig(level);
  const rate = Number(config?.commission_rate);
  return Number.isFinite(rate) && rate > 0 ? rate : 0.70;
}

export async function isFreeAudit(userId) {
  const level = await getUserLevel(userId);
  const config = await getLevelConfig(level);
  return config?.free_audit === 1 || config?.free_audit === true;
}

export async function getMarkWeight(userId) {
  const level = await getUserLevel(userId);
  const config = await getLevelConfig(level);
  return config?.mark_weight || 1;
}

export async function getPurchasePrice(opportunityId) {
  const [opp] = await query(
    'SELECT price, user_id FROM opportunities WHERE id = ?',
    [opportunityId]
  );
  if (!opp) return null;

  // P0-2：购买无折扣，统一原价（用户拍板：会员等级只影响分佣比例）
  const originalPrice = Number(opp.price);
  const finalPrice = Math.round(originalPrice);
  const rate = await getCommissionRate(opp.user_id);
  const sellerIncome = Math.round(finalPrice * rate);

  return {
    originalPrice,
    finalPrice,
    discount: 1,
    platformFee: finalPrice - sellerIncome,
    sellerIncome
  };
}

export async function calculateSellerEarnings(buyerId, sellerId, finalPrice) {
  // P0-2 新分佣模型（用户拍板）：购买无折扣；
  // 投稿人分佣 = 实付 × 等级分佣比例；平台抽成 = 实付 - 分佣；积分严格守恒
  const sellerCommissionRate = await getCommissionRate(sellerId);
  const sellerEarnings = Math.round(finalPrice * sellerCommissionRate);
  const platformFee = finalPrice - sellerEarnings;

  return {
    platformFee,
    sellerEarnings,
    netAmount: finalPrice - platformFee,
    sellerCommissionRate
  };
}

export async function recalculateAllLevels() {
  const users = await query('SELECT id FROM users WHERE status = "active"');
  const levelConfigs = await getAllLevelConfigs();

  let updated = 0;
  for (const user of users) {
    // P0-3 修正：购买率/无效率分母为全部已发布商机；有用率 = 摘要有用标记数/本人共享摘要数；
    // 活跃度 = 复合分（登录频率30% + 操作频次30% + 互动贡献40%，不含注册时长）
    const [stats] = await query(
      `SELECT
        (SELECT COUNT(*) FROM opportunities WHERE user_id = ? AND deleted_at IS NULL) AS published_opportunities,
        (SELECT COUNT(*) FROM opportunities WHERE user_id = ? AND deleted_at IS NULL AND purchase_count > 0) AS purchased_opportunities,
        (SELECT COUNT(*) FROM opportunities WHERE user_id = ? AND deleted_at IS NULL AND status = 'invalid') AS invalid_opportunities,
        (SELECT COUNT(*) FROM follow_up_shares WHERE user_id = ?) AS total_shares,
        (SELECT COALESCE(SUM(helpful_count), 0) FROM follow_up_shares WHERE user_id = ?) AS helpful_marks,
        (SELECT COUNT(DISTINCT login_date) FROM user_login_days
          WHERE user_id = ? AND login_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS login_days_30d,
        ((SELECT COUNT(*) FROM opportunities WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY))
          + (SELECT COUNT(*) FROM follow_ups WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY))
          + (SELECT COUNT(*) FROM follow_up_shares WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY))
          + (SELECT COUNT(*) FROM orders WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY))) AS ops_30d,
        (SELECT COUNT(*) FROM follow_up_helpful_marks m
          JOIN follow_up_shares s ON m.share_id = s.id
          WHERE s.user_id = ? AND m.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS helpful_marks_30d`,
      [user.id, user.id, user.id, user.id, user.id, user.id, user.id, user.id, user.id, user.id, user.id]
    );

    const published = stats.published_opportunities || 0;
    const purchased = stats.purchased_opportunities || 0;
    const invalid = stats.invalid_opportunities || 0;
    const shares = stats.total_shares || 0;
    const helpfulMarks = Number(stats.helpful_marks) || 0;

    const purchaseRate = published > 0 ? (purchased / published) * 100 : 0;
    const invalidRate = published > 0 ? (invalid / published) * 100 : 0;
    const usefulRate = shares > 0 ? Math.min(100, (helpfulMarks / shares) * 100) : 0;

    // P0-3 活跃度复合分（0~100，用户拍板权重 30/30/40）
    const loginDays = Number(stats.login_days_30d) || 0;
    const opsCount = Number(stats.ops_30d) || 0;
    const helpfulRecent = Number(stats.helpful_marks_30d) || 0;
    const loginScore = Math.min(100, (loginDays / 30) * 100);
    const opsScore = Math.min(100, (opsCount / 20) * 100);
    const interactiveScore = Math.min(100, (helpfulRecent / 5) * 100);
    const activity = Math.round(loginScore * 0.3 + opsScore * 0.3 + interactiveScore * 0.4);

    let newLevel = 'normal';
    for (const level of levelConfigs) {
      if (purchaseRate >= Number(level.purchase_rate_threshold) &&
          invalidRate <= Number(level.invalid_rate_threshold) &&
          usefulRate >= Number(level.helpful_rate_threshold) &&
          activity >= Number(level.activity_threshold)) {
        newLevel = level.level_key;
        break;
      }
    }

    // 等级变更通知（需求 5.6：等级变更实时生效并发送通知）
    const prevStats = await queryOne('SELECT level FROM user_level_stats WHERE user_id = ?', [user.id]);
    const prevLevel = prevStats?.level || 'normal';
    if (prevLevel !== newLevel) {
      const sorted = [...levelConfigs].sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
      const nameOf = (key) => sorted.find((l) => l.level_key === key)?.name || key;
      const prevIdx = sorted.findIndex((l) => l.level_key === prevLevel);
      const nextIdx = sorted.findIndex((l) => l.level_key === newLevel);
      const direction = nextIdx > prevIdx ? '升级' : '降级';
      await query(
        `INSERT INTO notifications (user_id, type, title, content)
         VALUES (?, 'system', '会员等级变更', ?)`,
        [user.id, `恭喜！您的会员等级已${direction}：${nameOf(prevLevel)} → ${nameOf(newLevel)}`]
      );
    }

    await query(
      `INSERT INTO user_level_stats (user_id, level, purchase_rate, invalid_rate, helpful_rate, activity_score, purchased_opportunities, total_opportunities, invalid_opportunities, total_shares, helpful_shares, last_calculated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE 
         level = VALUES(level),
         purchase_rate = VALUES(purchase_rate),
         invalid_rate = VALUES(invalid_rate),
         helpful_rate = VALUES(helpful_rate),
         activity_score = VALUES(activity_score),
         purchased_opportunities = VALUES(purchased_opportunities),
         total_opportunities = VALUES(total_opportunities),
         invalid_opportunities = VALUES(invalid_opportunities),
         total_shares = VALUES(total_shares),
         helpful_shares = VALUES(helpful_shares),
         last_calculated_at = NOW()`,
      [user.id, newLevel, purchaseRate, invalidRate, usefulRate, activity, 
       purchased, published, 
       invalid, shares, helpfulMarks]
    );

    clearUserLevelCache(user.id);
    updated++;
  }
  
  return { updated, total: users.length };
}