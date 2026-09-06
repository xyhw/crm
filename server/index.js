import { logger } from './services/logger.js';
import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';
import { initDatabase } from './migrations/001_init.js';
import { migrateP0Fields } from './migrations/002_p0_fields.js';
import { migrateAnnouncements } from './migrations/003_announcements.js';
import { migrateP1Indexes } from './migrations/004_p1_indexes.js';
import { migratePointsLogsRefund } from './migrations/005_points_logs_refund.js';
import { migrateOpportunityAddressWechat } from './migrations/006_opportunity_address_wechat.js';
import { migrateFollowUpHelpfulMarks } from './migrations/007_follow_up_helpful_marks.js';
import { migrateFollowUpShareInvalidMarks } from './migrations/008_follow_up_share_invalid_marks.js';
import { migratePaymentOrders } from './migrations/009_payment_orders.js';
import { migrateWaffoChannel } from './migrations/010_waffo_channel.js';
import { migratePasswordReset } from './migrations/011_password_reset.js';
import { migratePasswordResetAttempts } from './migrations/012_password_reset_attempts.js';
import { migrateSecurityGuards } from './migrations/013_security_guards.js';
import { migrateWechatBinding } from './migrations/014_wechat_binding.js';
import { migrateOpportunityTagsSortOrder } from './migrations/015_opportunity_tags_sort_order.js';
import { migrateOrdersRefundedRepurchase } from './migrations/016_orders_refunded_repurchase.js';
import { migrateP2Indexes } from './migrations/017_perf_indexes.js';
import { migratePermissionBackfill } from './migrations/018_permission_backfill.js';
import { ensureAndLoadPaymentConfig } from './services/payment/config-loader.js';
import { seedDatabase } from './seeds/seed.js';
import { closePool } from './db.js';
import { adminAuthRequired } from './auth.js';
import scheduler from './scheduler.js';
import { config } from './config.js';
import { apiLimiter } from './middleware/rate-limit.js';
import { requirePermission } from './middleware/require-permission.js';
import { paginationLimiter } from './middleware/pagination.js';
import { requestId } from './middleware/request-id.js';

// 路由导入
import authRoutes from './routes/auth.routes.js';
import opportunityRoutes from './routes/opportunity.routes.js';
import orderRoutes from './routes/order.routes.js';
import pointsRoutes from './routes/points.routes.js';
import followUpRoutes from './routes/follow-up.routes.js';
import crmRoutes from './routes/crm.routes.js';
import invitationRoutes from './routes/invitation.routes.js';
import bannerRoutes from './routes/banner.routes.js';
import rankingRoutes from './routes/ranking.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import statsRoutes from './routes/stats.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import remindersRoutes from './routes/reminders.routes.js';
import creditsRoutes from './routes/credits.routes.js';
import agreementRoutes from './routes/agreement.routes.js';
import announcementRoutes from './routes/announcements.routes.js';
import waffoWebhookRoutes from './routes/waffo-webhook.routes.js';
import vpayWebhookRoutes from './routes/vpay-webhook.routes.js';

// 后台路由
import adminAuthRoutes from './routes/admin/auth.routes.js';
import adminOpportunityRoutes from './routes/admin/opportunity.routes.js';
import adminUserRoutes from './routes/admin/user.routes.js';
import adminOrderRoutes from './routes/admin/order.routes.js';
import adminPointsRoutes from './routes/admin/points.routes.js';
import adminRechargeRoutes from './routes/admin/recharge.routes.js';
import adminLevelRoutes from './routes/admin/level.routes.js';
import adminConfigRoutes from './routes/admin/config.routes.js';
import adminAuditRoutes from './routes/admin/audit.routes.js';
import adminStatsRoutes from './routes/admin/stats.routes.js';
import adminAuditLogRoutes from './routes/admin/audit-log.routes.js';
import adminRoleRoutes from './routes/admin/role.routes.js';
import adminAdminsRoutes from './routes/admin/admins.routes.js';
import adminFinanceRoutes from './routes/admin/finance.routes.js';
import adminCategoryRoutes from './routes/admin/category.routes.js';
import adminTagRoutes from './routes/admin/tag.routes.js';
import adminNotificationRoutes from './routes/admin/notification.routes.js';
import adminUploadRoutes from './routes/admin/upload.routes.js';
import adminImportRoutes from './routes/admin/import.routes.js';
import adminBannerRoutes from './routes/admin/banner.routes.js';
import adminAnnouncementRoutes from './routes/admin/announcements.routes.js';

const app = express();

// 反代（nginx/CLB）后按真实客户端 IP 限流，避免所有请求共用一个限流桶
app.set('trust proxy', 1);

// 请求 ID：关联日志与响应头，便于排障
app.use(requestId);

// CORS：配置了白名单则仅放行白名单来源，否则开发环境允许任意来源
const corsOptions = config.corsOrigins.length ? { origin: config.corsOrigins } : {};
app.use(cors(corsOptions));

// Waffo / 虚拟支付回调必须使用原始 body 验签，须在全局 express.json() 之前挂载
app.use('/api/points/recharge/notify/waffo', express.raw({ type: '*/*' }), waffoWebhookRoutes);
app.use('/api/points/recharge/notify/wechat', express.raw({ type: ['*/xml', 'text/xml', 'application/xml', '*/*'] }), vpayWebhookRoutes);

app.use(express.json());

// 全局接口限流 + 分页参数钳制
app.use('/api', apiLimiter);
app.use('/api', paginationLimiter);

// Swagger API 文档
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 健康检查
const START_TIME = Date.now();
app.get('/api/health', async (req, res) => {
  const mem = process.memoryUsage();
  const dbOk = await (async () => {
    try {
      const { query } = await import('./db.js');
      await query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  })();
  res.json({
    code: dbOk ? 0 : 503,
    data: {
      status: dbOk ? 'ok' : 'degraded',
      time: Date.now(),
      uptime: Math.round((Date.now() - START_TIME) / 1000),
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      },
      db: dbOk ? 'up' : 'down',
    },
  });
});

// 用户端路由
app.use('/api/auth', authRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/follow-ups', followUpRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/agreement', agreementRoutes);
app.use('/api/announcements', announcementRoutes);

// 管理后台路由（adminAuthRequired 鉴权 + requirePermission 权限点授权）。
// 权限点由 role_permissions 表驱动（super_admin 直通），内置角色权限集由 018 迁移回填，
// 与原 requireRole 挂载行为一致；自定义角色按所配权限点获得访问。
app.use('/api/v1/admin/auth', adminAuthRoutes);
app.use('/api/v1/admin/audit-logs', adminAuthRequired, requirePermission('audit_logs'), adminAuditLogRoutes);
app.use('/api/v1/admin/roles', adminAuthRequired, requirePermission('roles'), adminRoleRoutes);
app.use('/api/v1/admin/admins', adminAuthRequired, requirePermission('admins'), adminAdminsRoutes);
app.use('/api/v1/admin/configs', adminAuthRequired, requirePermission('configs'), adminConfigRoutes);
app.use('/api/v1/admin/levels', adminAuthRequired, requirePermission('levels'), adminLevelRoutes);
app.use('/api/v1/admin/opportunities', adminAuthRequired, requirePermission('opportunities'), adminOpportunityRoutes);
app.use('/api/v1/admin/users', adminAuthRequired, requirePermission('users'), adminUserRoutes);
app.use('/api/v1/admin/audit', adminAuthRequired, requirePermission('audit'), adminAuditRoutes);
app.use('/api/v1/admin/categories', adminAuthRequired, requirePermission('categories'), adminCategoryRoutes);
app.use('/api/v1/admin/tags', adminAuthRequired, requirePermission('tags'), adminTagRoutes);
app.use('/api/v1/admin/notifications', adminAuthRequired, requirePermission('notifications'), adminNotificationRoutes);
app.use('/api/v1/admin/upload', adminAuthRequired, requirePermission('upload'), adminUploadRoutes);
app.use('/api/v1/admin/import', adminAuthRequired, requirePermission('opportunities.import'), adminImportRoutes);
app.use('/api/v1/admin/banners', adminAuthRequired, requirePermission('banners'), adminBannerRoutes);
app.use('/api/v1/admin/announcements', adminAuthRequired, requirePermission('announcements'), adminAnnouncementRoutes);
app.use('/api/v1/admin/orders', adminAuthRequired, requirePermission('orders'), adminOrderRoutes);
app.use('/api/v1/admin/points', adminAuthRequired, requirePermission('points'), adminPointsRoutes);
app.use('/api/v1/admin/recharge-orders', adminAuthRequired, requirePermission('recharge'), adminRechargeRoutes);
app.use('/api/v1/admin/finance', adminAuthRequired, requirePermission('finance'), adminFinanceRoutes);
// 统计：运营、财务、超管均可查看
app.use('/api/v1/admin/stats', adminAuthRequired, requirePermission('dashboard'), adminStatsRoutes);

// 静态文件服务
app.use('/uploads', express.static(config.uploadDir));

// 404 处理
app.use((req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

// 错误处理：结构化日志（含请求 ID 与堆栈），不向客户端外泄内部信息
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { requestId: req.id, method: req.method, path: req.originalUrl, err });
  if (res.headersSent) return next(err);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});

// 启动服务
async function start() {
  try {
    // 确保上传目录存在
    fs.mkdirSync(config.uploadDir, { recursive: true });

    // 初始化数据库
    await initDatabase();
    logger.info('[server] Database initialized');

    // P0 字段迁移（幂等）
    await migrateP0Fields();
    logger.info('[server] P0 fields migrated');

    // 公告表迁移（幂等）
    await migrateAnnouncements();
    logger.info('[server] Announcements table ready');

    // P1 索引迁移（幂等）
    await migrateP1Indexes();
    logger.info('[server] P1 indexes applied');

    // 积分流水 source_type 枚举补 refund（幂等）
    await migratePointsLogsRefund();
    logger.info('[server] points_logs.source_type enum ready');

    await migrateOpportunityAddressWechat();
    logger.info('[server] opportunities address/wechat columns ready');

    await migrateFollowUpHelpfulMarks();
    logger.info('[server] follow_up_helpful_marks table ready');

    await migrateFollowUpShareInvalidMarks();
    logger.info('[server] follow_up_share_invalid_marks table ready');

    // 支付订单表 + points_logs.source_type 补 penalty（幂等）
    await migratePaymentOrders();
    logger.info('[server] payment_orders table ready');

    await migrateWaffoChannel();
    logger.info('[server] payment_orders.channel +waffo');

    await migratePasswordReset();
    logger.info('[server] users.token_version + password_reset_codes ready');

    await migratePasswordResetAttempts();
    logger.info('[server] password_reset_codes.attempts ready');

    await migrateSecurityGuards();
    logger.info('[server] login_failures + roles + admin binding ready');

    await migrateWechatBinding();
    logger.info('[server] users.wechat_openid/unionid ready (预留)');

    await migrateOpportunityTagsSortOrder();
    await migrateOrdersRefundedRepurchase();
    logger.info('[server] opportunity_tags.sort_order ready');

    // P2 性能索引（幂等）
    await migrateP2Indexes();
    logger.info('[server] P2 performance indexes applied');

    // 权限点回填（幂等；激活 role_permissions 表驱动授权）
    await migratePermissionBackfill();
    logger.info('[server] permission backfill applied');

    // 种子数据
    await seedDatabase();
    logger.info('[server] Seed data loaded');

    // 加载支付渠道配置（system_configs 覆盖环境变量，支持后台热更新）
    await ensureAndLoadPaymentConfig();
    logger.info('[server] payment config loaded from DB');

    // 启动服务器
    app.listen(config.port, () => {
      logger.info(`[server] Hotel Order Follow API listening on http://localhost:${config.port}`);
      scheduler.start();
    });
  } catch (err) {
    logger.error('[server] Failed to start:', err);
    process.exit(1);
  }
}

// 优雅退出
process.on('SIGINT', async () => {
  logger.info('[server] Shutting down...');
  scheduler.stop();
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('[server] Shutting down...');
  scheduler.stop();
  await closePool();
  process.exit(0);
});

start();
