import 'dotenv/config';

function readSecret(name, devDefault) {
  const val = process.env[name];
  if (val && val.trim() !== '') return val.trim();
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`[config] 缺少必要的环境变量 ${name}，请通过 .env 或环境注入配置后再启动`);
  }
  return devDefault;
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: readSecret('JWT_SECRET', 'hotel-order-follow-dev-secret-2026'),
  refreshSecret: readSecret('REFRESH_SECRET', 'hotel-order-follow-refresh-secret-2026'),
  adminSecret: readSecret('ADMIN_SECRET', 'admin-secret-2026'),
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'hof_user',
    password: process.env.DB_PASS || 'hof_pass_2026',
    database: process.env.DB_NAME || 'hotel_order_follow',
    charset: 'utf8mb4',
  },
  uploadDir: process.env.UPLOAD_DIR || '/workspace/uploads',
  payment: {
    // 1积分兑换金额（元），默认1积分=1元
    pointsToYuan: parseFloat(process.env.PAY_POINTS_TO_YUAN || '1'),
    // 订单过期时间（秒），默认30分钟
    orderTtl: parseInt(process.env.PAY_ORDER_TTL || '1800', 10),
    // 默认渠道（开发用 mock）
    defaultChannel: process.env.PAY_DEFAULT_CHANNEL || 'mock',
    // 站点对外域名（回调/支付跳转的基础地址，后台可配）
    siteBaseUrl: process.env.PAY_SITE_BASE_URL || '',
    // mock 渠道是否自动完成支付（开发默认 true）
    mockAutoPay: process.env.PAY_MOCK_AUTOPAY !== 'false',
    wechat: {
      appId: process.env.PAY_WECHAT_APPID || '',
      mchId: process.env.PAY_WECHAT_MCHID || '',
      apiV3Key: process.env.PAY_WECHAT_APIV3KEY || '',
      serialNo: process.env.PAY_WECHAT_SERIALNO || '',
      privateKeyPath: process.env.PAY_WECHAT_PRIVATE_KEY_PATH || '',
      notifyUrl: process.env.PAY_WECHAT_NOTIFY_URL || '',
    },
    alipay: {
      appId: process.env.PAY_ALIPAY_APPID || '',
      privateKey: process.env.PAY_ALIPAY_PRIVATE_KEY || '',
      alipayPublicKey: process.env.PAY_ALIPAY_PUBLIC_KEY || '',
      notifyUrl: process.env.PAY_ALIPAY_NOTIFY_URL || '',
    },
    stripe: {
      secretKey: process.env.PAY_STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.PAY_STRIPE_WEBHOOK_SECRET || '',
    },
    waffo: {
      merchantId: process.env.PAY_WAFFO_MERCHANT_ID || '',
      privateKey: process.env.PAY_WAFFO_PRIVATE_KEY || '',
      storeId: process.env.PAY_WAFFO_STORE_ID || '',
      productId: process.env.PAY_WAFFO_PRODUCT_ID || '',
      currency: process.env.PAY_WAFFO_CURRENCY || 'USD',
      environment: process.env.PAY_WAFFO_ENVIRONMENT || 'test',
      successUrl: process.env.PAY_WAFFO_SUCCESS_URL || '',
    },
  },
  rateLimit: {
    api: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS || '60000', 10),
    apiMax: parseInt(process.env.RATE_LIMIT_API_MAX || '300', 10),
    loginWindowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS || '60000', 10),
    loginMax: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || '10', 10),
  },
  mail: {
    // log: 开发环境打印到日志；smtp: 真实发送
    provider: process.env.MAIL_PROVIDER || 'log',
    from: process.env.MAIL_FROM || 'noreply@localhost',
    smtp: {
      host: process.env.MAIL_SMTP_HOST || '',
      port: parseInt(process.env.MAIL_SMTP_PORT || '465', 10),
      secure: process.env.MAIL_SMTP_SECURE !== 'false',
      user: process.env.MAIL_SMTP_USER || '',
      pass: process.env.MAIL_SMTP_PASS || '',
    },
  },
};
