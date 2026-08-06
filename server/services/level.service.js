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

export function clearLevelConfigCache() {
  if (global.levelCache) {
    for (const key of global.levelCache.keys()) {
      if (key.startsWith(CONFIG_CACHE_PREFIX)) {
        global.levelCache.delete(key);
      }
    }
  }
}

export async function calculatePurchaseDiscount(userId) {
  const level = await getUserLevel(userId);
  const config = await getLevelConfig(level);
  return config?.purchase_discount || 1.00;
}

export async function calculateCommissionRate(userId) {
  const level = await getUserLevel(userId);
  const config = await getLevelConfig(level);
  const baseRate = 0.40;
  const bonus = Number(config?.commission_bonus) || 0;
  return baseRate * (1 + bonus);
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

export async function getPurchasePrice(opportunityId, buyerId) {
  const [opp] = await query(
    'SELECT price FROM opportunities WHERE id = ?',
    [opportunityId]
  );
  if (!opp) return null;

  const discount = await calculatePurchaseDiscount(buyerId);
  const originalPrice = opp.price;
  const finalPrice = Math.round(originalPrice * discount);
  
  return {
    originalPrice,
    finalPrice,
    discount,
    platformFee: Math.round(finalPrice * 0.20),
    sellerIncome: finalPrice - Math.round(finalPrice * 0.20)
  };
}

export async function calculateSellerEarnings(buyerId, sellerId, finalPrice) {
  const platformFee = Math.round(finalPrice * 0.20);
  const netAmount = finalPrice - platformFee;
  
  const sellerCommissionRate = await calculateCommissionRate(sellerId);
  const sellerEarnings = Math.round(netAmount * sellerCommissionRate);
  
  return {
    platformFee,
    sellerEarnings,
    netAmount,
    sellerCommissionRate
  };
}

export async function recalculateAllLevels() {
  const users = await query('SELECT id FROM users WHERE status = "active"');
  const levelConfigs = await getAllLevelConfigs();
  
  let updated = 0;
  for (const user of users) {
    const [stats] = await query(
      `SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        SUM(CASE WHEN o.status = 'paid' THEN 1 ELSE 0 END) as completed_orders,
        (SELECT COUNT(*) FROM follow_up_shares fus 
         JOIN opportunities op ON fus.opportunity_id = op.id 
         WHERE op.user_id = ? AND fus.status = 'approved') as useful_shares,
        (SELECT COUNT(*) FROM opportunities WHERE user_id = ? AND status = 'active') as total_opportunities,
        (SELECT COUNT(*) FROM opportunities WHERE user_id = ? AND status = 'invalidated') as invalid_opportunities,
        (SELECT COUNT(*) FROM crm_opportunities WHERE user_id = ?) as total_crm
      FROM orders o WHERE o.user_id = ? AND o.status = 'paid'`,
      [user.id, user.id, user.id, user.id, user.id]
    );

    const totalOrders = stats.total_orders || 0;
    const purchaseRate = totalOrders > 0 ? (stats.completed_orders / totalOrders) * 100 : 0;
    const invalidRate = stats.total_opportunities > 0 
      ? (stats.invalid_opportunities / stats.total_opportunities) * 100 
      : 0;
    const usefulRate = stats.total_crm > 0 
      ? (stats.useful_shares / stats.total_crm) * 100 
      : 0;
    const activity = stats.total_crm || 0;

    let newLevel = 'normal';
    for (const level of levelConfigs) {
      if (purchaseRate >= level.purchase_rate_threshold &&
          invalidRate <= level.invalid_rate_threshold &&
          usefulRate >= level.helpful_rate_threshold &&
          activity >= level.activity_threshold) {
        newLevel = level.level_key;
        break;
      }
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
       stats.completed_orders || 0, stats.total_opportunities || 0, 
       stats.invalid_opportunities || 0, stats.total_crm || 0, stats.useful_shares || 0]
    );

    clearUserLevelCache(user.id);
    updated++;
  }
  
  return { updated, total: users.length };
}