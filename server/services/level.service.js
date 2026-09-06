import { query, queryOne, getConnection } from '../db.js';

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

export function clearAllUserLevelCaches() {
  try {
    if (global.levelCache) {
      for (const key of global.levelCache.keys()) {
        if (key.startsWith(CACHE_PREFIX)) {
          global.levelCache.delete(key);
        }
      }
    }
  } catch {}
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
  const levelConfigs = await getAllLevelConfigs();
  // 修复：原实现按 sort_order 升序匹配且「普通会员」阈值恒满足、循环命中即 break，
  // 导致所有用户永远停留在 normal。改为降序（高等级优先）匹配首个满足的等级。
  const orderedLevels = [...levelConfigs].sort((a, b) => b.sort_order - a.sort_order);

  // 一次性聚合全部活跃用户的四维数据（消除原逐用户 5 连子查询的 N+1）；
  // 口径保持与原实现一致：total_orders 仅统计 paid 订单（purchase_rate 因此为 0/100 二值）
  const [statRows, usefulRows] = await Promise.all([
    query(`
      SELECT u.id AS user_id,
             COALESCE(o.total_orders, 0) AS total_orders,
             COALESCE(opp.total_opp, 0) AS total_opportunities,
             COALESCE(opp.invalid_opp, 0) AS invalid_opportunities,
             COALESCE(crm.crm_cnt, 0) AS total_crm
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS total_orders FROM orders WHERE status = 'paid' GROUP BY user_id
      ) o ON o.user_id = u.id
      LEFT JOIN (
        SELECT user_id,
               SUM(status = 'active') AS total_opp,
               SUM(status = 'invalid') AS invalid_opp
        FROM opportunities GROUP BY user_id
      ) opp ON opp.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS crm_cnt FROM crm_opportunities GROUP BY user_id
      ) crm ON crm.user_id = u.id
      WHERE u.status = 'active'`),
    // 修复：原实现误用 fus.status = 'approved'（status 为跟进状态枚举，永不相等），
    // 审核状态字段为 audit_status，导致 useful_shares 恒为 0
    query(`
      SELECT op.user_id AS user_id, COUNT(*) AS useful_shares
      FROM follow_up_shares fus
      JOIN opportunities op ON fus.opportunity_id = op.id
      WHERE fus.audit_status = 'approved'
      GROUP BY op.user_id`),
  ]);

  const usefulMap = new Map(usefulRows.map((r) => [r.user_id, Number(r.useful_shares) || 0]));
  const total = statRows.length;

  const values = [];
  const flush = async (conn) => {
    if (values.length === 0) return;
    await conn.query(
      `INSERT INTO user_level_stats
         (user_id, level, purchase_rate, invalid_rate, helpful_rate, activity_score,
          purchased_opportunities, total_opportunities, invalid_opportunities, total_shares, helpful_shares, last_calculated_at)
       VALUES ?
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
      [values]
    );
    values.length = 0;
  };

  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    for (const row of statRows) {
      const userId = row.user_id;
      const totalOrders = Number(row.total_orders) || 0;
      const totalOpportunities = Number(row.total_opportunities) || 0;
      const invalidOpportunities = Number(row.invalid_opportunities) || 0;
      const totalCrm = Number(row.total_crm) || 0;
      const usefulShares = usefulMap.get(userId) || 0;

      const purchaseRate = totalOrders > 0 ? 100 : 0;
      const invalidRate = totalOpportunities > 0 ? (invalidOpportunities / totalOpportunities) * 100 : 0;
      const usefulRate = totalCrm > 0 ? (usefulShares / totalCrm) * 100 : 0;
      const activity = totalCrm;

      let newLevel = 'normal';
      for (const level of orderedLevels) {
        if (purchaseRate >= Number(level.purchase_rate_threshold) &&
            invalidRate <= Number(level.invalid_rate_threshold) &&
            usefulRate >= Number(level.helpful_rate_threshold) &&
            activity >= Number(level.activity_threshold)) {
          newLevel = level.level_key;
          break;
        }
      }

      values.push([
        userId, newLevel, purchaseRate, invalidRate, usefulRate, activity,
        totalOrders, totalOpportunities, invalidOpportunities, totalCrm, usefulShares,
      ]);
      if (values.length >= 500) await flush(conn);
    }
    await flush(conn);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  // 等级批量变化后清空全部用户等级缓存
  clearAllUserLevelCaches();

  return { updated: total, total };
}