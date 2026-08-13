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
  rateLimit: {
    api: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS || '60000', 10),
    apiMax: parseInt(process.env.RATE_LIMIT_API_MAX || '300', 10),
    loginWindowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS || '60000', 10),
    loginMax: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || '10', 10),
  },
};
