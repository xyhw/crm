import { PAY_CONFIG_KEYS } from './payment/config-loader.js';

/**
 * system_configs 允许写入的键白名单（管理后台 PUT /api/v1/admin/configs 校验用）。
 * 新增可配置项时必须同步登记到这里，避免任意 key 写库。
 */

// 业务基础配置（与 seeds/seed.js SYSTEM_CONFIGS 对应）
const BUSINESS_CONFIG_KEYS = [
  'register_gift_points',
  'invite_reward_points',
  'platform_commission_rate',
  'points_expire_days',
  'invalid_threshold',
  'invalid_penalty_rate',
  'invalid_ban_threshold',
  'opportunity_price_min',
  'opportunity_price_max',
  'share_reward_points',
  'helpful_reward_points',
  'points_recharge_limit',
  'similarity_threshold',
  'credit_ban_threshold',
  'credit_review_threshold',
  'points_mall_enabled',
  // follow-up.routes.js 读取但未在 seed 中初始化，允许后台补配
  'share_invalid_threshold',
];

// 协议/政策内容键（agreement.routes.js ALLOWED_TYPES → agreement_${type}）
const AGREEMENT_TYPES = ['agreement', 'privacy', 'summary', 'disclaimer', 'service', 'refund', 'complaint'];
const AGREEMENT_CONFIG_KEYS = AGREEMENT_TYPES.map((t) => `agreement_${t}`);

export const ALLOWED_CONFIG_KEYS = new Set([
  ...BUSINESS_CONFIG_KEYS,
  ...AGREEMENT_CONFIG_KEYS,
  ...PAY_CONFIG_KEYS,
]);

export function isAllowedConfigKey(key) {
  return ALLOWED_CONFIG_KEYS.has(key);
}
