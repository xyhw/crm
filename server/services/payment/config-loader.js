import { query, queryOne, insert } from '../../db.js';
import { config } from '../../config.js';

/**
 * 支付渠道配置项定义。
 * 每项 key 为 system_configs.config_key（pay_ 前缀），env 为环境变量默认值取值函数，
 * type 决定 DB 存储与解析类型。后台保存后由 ensureAndLoadPaymentConfig 重新加载，
 * 逐属性写回 config.payment（保持对象引用不变，已缓存的适配器实例实时生效）。
 */
const PAY_CONFIG_DEFS = [
  { key: 'pay_default_channel', env: () => config.payment.defaultChannel, type: 'string', desc: '默认支付渠道' },
  { key: 'pay_site_base_url', env: () => config.payment.siteBaseUrl, type: 'string', desc: '站点对外域名(回调/跳转基础地址,如 https://example.com)' },
  { key: 'pay_mock_autopay', env: () => config.payment.mockAutoPay, type: 'boolean', desc: 'mock渠道自动完成支付' },
  { key: 'pay_points_to_yuan', env: () => config.payment.pointsToYuan, type: 'number', desc: '1积分兑换金额(元)' },
  { key: 'pay_order_ttl', env: () => config.payment.orderTtl, type: 'number', desc: '订单过期时间(秒)' },
  { key: 'pay_wechat_enabled', env: () => false, type: 'boolean', desc: '微信虚拟支付开关' },
  { key: 'pay_wechat_appid', env: () => config.payment.wechat.appId, type: 'string', desc: '小程序AppID' },
  { key: 'pay_wechat_offer_id', env: () => config.payment.wechat.offerId, type: 'string', desc: '虚拟支付OfferID' },
  { key: 'pay_wechat_appkey', env: () => config.payment.wechat.appKey, type: 'string', desc: '虚拟支付现网AppKey' },
  { key: 'pay_wechat_product_map', env: () => config.payment.wechat.productMap, type: 'string', desc: '积分到道具ID映射JSON，如 {"50":"prod_50"}' },
  { key: 'pay_wechat_env', env: () => config.payment.wechat.env, type: 'number', desc: '虚拟支付环境 0现网 1沙箱' },
  { key: 'pay_wechat_push_token', env: () => config.payment.wechat.pushToken, type: 'string', desc: '消息推送Token(用于URL验证与发货推送)' },
  { key: 'pay_wechat_notify_url', env: () => config.payment.wechat.notifyUrl, type: 'string', desc: '发货推送URL' },
  { key: 'pay_wechat_mchid', env: () => config.payment.wechat.mchId, type: 'string', desc: '微信商户号(兼容字段,虚拟支付可不填)' },
  { key: 'pay_wechat_apiv3key', env: () => config.payment.wechat.apiV3Key, type: 'string', desc: '微信APIv3密钥(兼容字段)' },
  { key: 'pay_wechat_serialno', env: () => config.payment.wechat.serialNo, type: 'string', desc: '微信证书序列号(兼容字段)' },
  { key: 'pay_wechat_private_key_path', env: () => config.payment.wechat.privateKeyPath, type: 'string', desc: '微信商户私钥路径(兼容字段)' },
  { key: 'pay_alipay_enabled', env: () => false, type: 'boolean', desc: '支付宝开关' },
  { key: 'pay_alipay_appid', env: () => config.payment.alipay.appId, type: 'string', desc: '支付宝AppID' },
  { key: 'pay_alipay_private_key', env: () => config.payment.alipay.privateKey, type: 'string', desc: '支付宝应用私钥' },
  { key: 'pay_alipay_public_key', env: () => config.payment.alipay.alipayPublicKey, type: 'string', desc: '支付宝公钥' },
  { key: 'pay_alipay_notify_url', env: () => config.payment.alipay.notifyUrl, type: 'string', desc: '支付宝回调URL' },
  { key: 'pay_stripe_enabled', env: () => false, type: 'boolean', desc: 'Stripe开关' },
  { key: 'pay_stripe_secret_key', env: () => config.payment.stripe.secretKey, type: 'string', desc: 'Stripe密钥' },
  { key: 'pay_stripe_webhook_secret', env: () => config.payment.stripe.webhookSecret, type: 'string', desc: 'Stripe Webhook密钥' },
  { key: 'pay_waffo_enabled', env: () => false, type: 'boolean', desc: 'Waffo支付开关' },
  { key: 'pay_waffo_merchant_id', env: () => config.payment.waffo.merchantId, type: 'string', desc: 'Waffo Merchant ID' },
  { key: 'pay_waffo_private_key', env: () => config.payment.waffo.privateKey, type: 'string', desc: 'Waffo RSA私钥' },
  { key: 'pay_waffo_store_id', env: () => config.payment.waffo.storeId, type: 'string', desc: 'Waffo Store ID' },
  { key: 'pay_waffo_product_id', env: () => config.payment.waffo.productId, type: 'string', desc: 'Waffo 商品ID(留空自动创建)' },
  { key: 'pay_waffo_currency', env: () => config.payment.waffo.currency, type: 'string', desc: 'Waffo 结算币种' },
  { key: 'pay_waffo_environment', env: () => config.payment.waffo.environment, type: 'string', desc: 'Waffo 环境(test/prod)' },
  { key: 'pay_waffo_success_url', env: () => config.payment.waffo.successUrl, type: 'string', desc: 'Waffo 支付成功跳转URL' },
];

function parseVal(raw, type, fallback) {
  if (raw === null || raw === undefined || raw === '') return fallback;
  if (type === 'boolean') return raw === true || raw === 'true';
  if (type === 'number') {
    const n = Number(raw);
    return Number.isNaN(n) ? fallback : n;
  }
  return String(raw);
}

/**
 * 确保 system_configs 中存在所有 pay_* 配置项（不存在则按 env 默认值插入），
 * 随后从 DB 加载覆盖 config.payment 各字段。
 * 在服务启动（seed 后）与后台保存配置后调用，保证运行时配置可热更新。
 */
export async function ensureAndLoadPaymentConfig() {
  for (const def of PAY_CONFIG_DEFS) {
    const row = await queryOne('SELECT config_key FROM system_configs WHERE config_key = ?', [def.key]);
    if (!row) {
      await insert('system_configs', {
        config_key: def.key,
        config_value: String(def.env()),
        config_type: def.type,
        description: def.desc,
      });
    }
  }

  const rows = await query("SELECT config_key, config_value FROM system_configs WHERE config_key LIKE 'pay_%'");
  const map = {};
  for (const r of rows) map[r.config_key] = r.config_value;

  // 逐属性更新，保持 config.payment.wechat/alipay/stripe 对象引用不变，
  // 使已缓存的适配器实例（this.cfg 持引用）能读到最新值。
  config.payment.defaultChannel = parseVal(map.pay_default_channel, 'string', config.payment.defaultChannel);
  config.payment.siteBaseUrl = parseVal(map.pay_site_base_url, 'string', '').replace(/\/+$/, '');
  config.payment.mockAutoPay = parseVal(map.pay_mock_autopay, 'boolean', true);
  config.payment.pointsToYuan = parseVal(map.pay_points_to_yuan, 'number', config.payment.pointsToYuan);
  config.payment.orderTtl = parseVal(map.pay_order_ttl, 'number', config.payment.orderTtl);

  config.payment.wechat.appId = parseVal(map.pay_wechat_appid, 'string', '');
  config.payment.wechat.offerId = parseVal(map.pay_wechat_offer_id, 'string', '');
  config.payment.wechat.appKey = parseVal(map.pay_wechat_appkey, 'string', '');
  config.payment.wechat.productMap = parseVal(map.pay_wechat_product_map, 'string', '');
  config.payment.wechat.env = parseVal(map.pay_wechat_env, 'number', 0);
  config.payment.wechat.pushToken = parseVal(map.pay_wechat_push_token, 'string', '');
  config.payment.wechat.notifyUrl = parseVal(map.pay_wechat_notify_url, 'string', '');
  config.payment.wechat.mchId = parseVal(map.pay_wechat_mchid, 'string', '');
  config.payment.wechat.apiV3Key = parseVal(map.pay_wechat_apiv3key, 'string', '');
  config.payment.wechat.serialNo = parseVal(map.pay_wechat_serialno, 'string', '');
  config.payment.wechat.privateKeyPath = parseVal(map.pay_wechat_private_key_path, 'string', '');

  config.payment.alipay.appId = parseVal(map.pay_alipay_appid, 'string', '');
  config.payment.alipay.privateKey = parseVal(map.pay_alipay_private_key, 'string', '');
  config.payment.alipay.alipayPublicKey = parseVal(map.pay_alipay_public_key, 'string', '');
  config.payment.alipay.notifyUrl = parseVal(map.pay_alipay_notify_url, 'string', '');

  config.payment.stripe.secretKey = parseVal(map.pay_stripe_secret_key, 'string', '');
  config.payment.stripe.webhookSecret = parseVal(map.pay_stripe_webhook_secret, 'string', '');

  config.payment.waffo.merchantId = parseVal(map.pay_waffo_merchant_id, 'string', '');
  config.payment.waffo.privateKey = parseVal(map.pay_waffo_private_key, 'string', '');
  config.payment.waffo.storeId = parseVal(map.pay_waffo_store_id, 'string', '');
  config.payment.waffo.productId = parseVal(map.pay_waffo_product_id, 'string', '');
  config.payment.waffo.currency = parseVal(map.pay_waffo_currency, 'string', 'USD');
  config.payment.waffo.environment = parseVal(map.pay_waffo_environment, 'string', 'test');
  config.payment.waffo.successUrl = parseVal(map.pay_waffo_success_url, 'string', '');

  // 渠道可用性：mock 仅在非生产环境可用；其余渠道由后台开关决定（开关关闭则视为不可用）
  config.payment._channelEnabled = {
    mock: process.env.NODE_ENV !== 'production',
    wechat: parseVal(map.pay_wechat_enabled, 'boolean', false),
    alipay: parseVal(map.pay_alipay_enabled, 'boolean', false),
    stripe: parseVal(map.pay_stripe_enabled, 'boolean', false),
    waffo: parseVal(map.pay_waffo_enabled, 'boolean', false),
  };
}

export const PAY_CONFIG_KEYS = PAY_CONFIG_DEFS.map((d) => d.key);
