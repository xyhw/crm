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
import { ensureAndLoadPaymentConfig } from './services/payment/config-loader.js';
import { seedDatabase } from './seeds/seed.js';
import { closePool } from './db.js';
import { adminAuthRequired } from './auth.js';
import scheduler from './scheduler.js';
import { config } from './config.js';
import { apiLimiter } from './middleware/rate-limit.js';

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

// 后台路由
import adminAuthRoutes from './routes/admin/auth.routes.js';
import adminOpportunityRoutes from './routes/admin/opportunity.routes.js';
import adminUserRoutes from './routes/admin/user.routes.js';
import adminOrderRoutes from './routes/admin/order.routes.js';
import adminPointsRoutes from './routes/admin/points.routes.js';
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

app.use(cors());

// Waffo 回调必须使用原始 body 验签，须在全局 express.json() 之前挂载
app.use('/api/points/recharge/notify/waffo', express.raw({ type: '*/*' }), waffoWebhookRoutes);

app.use(express.json());

// 全局接口限流
app.use('/api', apiLimiter);

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

// 管理后台路由
app.use('/api/v1/admin/auth', adminAuthRoutes);
app.use('/api/v1/admin/opportunities', adminAuthRequired, adminOpportunityRoutes);
app.use('/api/v1/admin/users', adminAuthRequired, adminUserRoutes);
app.use('/api/v1/admin/orders', adminAuthRequired, adminOrderRoutes);
app.use('/api/v1/admin/points', adminAuthRequired, adminPointsRoutes);
app.use('/api/v1/admin/levels', adminAuthRequired, adminLevelRoutes);
app.use('/api/v1/admin/configs', adminAuthRequired, adminConfigRoutes);
app.use('/api/v1/admin/audit', adminAuthRequired, adminAuditRoutes);
app.use('/api/v1/admin/stats', adminAuthRequired, adminStatsRoutes);
app.use('/api/v1/admin/audit-logs', adminAuthRequired, adminAuditLogRoutes);
app.use('/api/v1/admin/roles', adminAuthRequired, adminRoleRoutes);
app.use('/api/v1/admin/admins', adminAuthRequired, adminAdminsRoutes);
app.use('/api/v1/admin/finance', adminAuthRequired, adminFinanceRoutes);
app.use('/api/v1/admin/categories', adminAuthRequired, adminCategoryRoutes);
app.use('/api/v1/admin/tags', adminAuthRequired, adminTagRoutes);
app.use('/api/v1/admin/notifications', adminAuthRequired, adminNotificationRoutes);
app.use('/api/v1/admin/upload', adminAuthRequired, adminUploadRoutes);
app.use('/api/v1/admin/import', adminAuthRequired, adminImportRoutes);
app.use('/api/v1/admin/banners', adminAuthRequired, adminBannerRoutes);
app.use('/api/v1/admin/announcements', adminAuthRequired, adminAnnouncementRoutes);

// 静态文件服务
app.use('/uploads', express.static(config.uploadDir));

// 404 处理
app.use((req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});

// 启动服务
async function start() {
  try {
    // 确保上传目录存在
    fs.mkdirSync(config.uploadDir, { recursive: true });

    // 初始化数据库
    await initDatabase();
    console.log('[server] Database initialized');

    // P0 字段迁移（幂等）
    await migrateP0Fields();
    console.log('[server] P0 fields migrated');

    // 公告表迁移（幂等）
    await migrateAnnouncements();
    console.log('[server] Announcements table ready');

    // P1 索引迁移（幂等）
    await migrateP1Indexes();
    console.log('[server] P1 indexes applied');

    // 积分流水 source_type 枚举补 refund（幂等）
    await migratePointsLogsRefund();
    console.log('[server] points_logs.source_type enum ready');

    await migrateOpportunityAddressWechat();
    console.log('[server] opportunities address/wechat columns ready');

    await migrateFollowUpHelpfulMarks();
    console.log('[server] follow_up_helpful_marks table ready');

    await migrateFollowUpShareInvalidMarks();
    console.log('[server] follow_up_share_invalid_marks table ready');

    // 支付订单表 + points_logs.source_type 补 penalty（幂等）
    await migratePaymentOrders();
    console.log('[server] payment_orders table ready');

    // 种子数据
    await seedDatabase();
    console.log('[server] Seed data loaded');

    // 加载支付渠道配置（system_configs 覆盖环境变量，支持后台热更新）
    await ensureAndLoadPaymentConfig();
    console.log('[server] payment config loaded from DB');

    // 启动服务器
    app.listen(config.port, () => {
      console.log(`[server] Hotel Order Follow API listening on http://localhost:${config.port}`);
      scheduler.start();
    });
  } catch (err) {
    console.error('[server] Failed to start:', err);
    process.exit(1);
  }
}

// 优雅退出
process.on('SIGINT', async () => {
  console.log('[server] Shutting down...');
  scheduler.stop();
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[server] Shutting down...');
  scheduler.stop();
  await closePool();
  process.exit(0);
});

start();
