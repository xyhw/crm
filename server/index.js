import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';
import { initDatabase } from './migrations/001_init.js';
import { seedDatabase } from './seeds/seed.js';
import { closePool } from './db.js';
import { adminAuthRequired } from './auth.js';
import scheduler from './scheduler.js';

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

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Swagger API 文档
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 健康检查
app.get('/api/health', async (req, res) => {
  res.json({ code: 0, data: { status: 'ok', time: Date.now() } });
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

// 静态文件服务
app.use('/uploads', express.static(process.env.UPLOAD_DIR || '/workspace/uploads'));

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
    const uploadDir = process.env.UPLOAD_DIR || '/workspace/uploads';
    fs.mkdirSync(uploadDir, { recursive: true });

    // 初始化数据库
    await initDatabase();
    console.log('[server] Database initialized');

    // 种子数据
    await seedDatabase();
    console.log('[server] Seed data loaded');

    // 启动服务器
    app.listen(PORT, () => {
      console.log(`[server] Hotel Order Follow API listening on http://localhost:${PORT}`);
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
