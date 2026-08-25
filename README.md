# 跟单互助 · 酒店供应链在线跟单系统

面向酒店从筹建到开业全链路供应链的**供应商互助平台**（H5 用户端 + Web 管理后台）。覆盖装修总包、弱电总包、软装总包、酒店家具、酒店运营物资等领域，通过「投稿跟单 → 积分购买 → 跟进共享 → 分佣激励」的积分飞轮实现**人人分享，人人受益**。

## 功能模块

### 用户端（H5）

| 模块 | 说明 |
|------|------|
| 互助大厅 | 跟单浏览 / 分类筛选 / 关键词搜索 |
| 发布跟单 | 投稿即上架，相似度检测提示 |
| 商机详情 | 公开字段 / 积分解锁完整联系方式 |
| 个人 CRM | 客户档案、跟进记录（状态机管理）、提醒中心 |
| 积分与充值 | 积分明细、余额查询、在线充值 |
| 支付 | Waffo 支付网关收银台 + 支付结果页（成功/失败/超时） |
| 社区运营 | 邀请好友、排行榜、公告简报、通知中心、信用分、会员等级 |

### 管理后台（Web）

RBAC 权限模型（超级管理员/运营/财务/客服），包含：数据看板、财务看板、用户管理、商机管理与导入、审核流（内容审核 + 审计日志）、订单与积分流水、Banner/分类/标签/公告/通知管理、会员等级配置、协议配置、管理员与角色管理。

核心的**系统配置**支持在线调整支付开关、默认支付渠道（mock/waffo）、Waffo 凭据与环境（test/prod）、站点域名等，无需重启服务。

## 技术栈

- **前端**：React 18 + Vite + React Vant 3（H5）+ React Router，测试用 Vitest
- **后端**：Node.js (ESM) + Express + MySQL 8.0（mysql2 连接池），测试用 `node --test`
- **认证**：JWT access + refresh 双令牌，登录限流防爆破，bcrypt 密码哈希
- **支付**：[@waffo/pancake-ts](https://www.npmjs.com/package/@waffo/pancake-ts) SDK，webhook 回调原始 body 验签；内置 mock 渠道供开发调试
- **API 文档**：Swagger（swagger-jsdoc + swagger-ui-express）
- **部署**：Docker Compose 三服务编排（见下文）

## 目录结构

```
.
├── client/                    # React H5 + 管理后台前端
│   ├── src/api/               #   API 封装（基址 '/api'）
│   ├── src/pages/             #   用户端页面
│   ├── src/pages/admin/       #   管理后台页面
│   └── test/                  #   Vitest 测试（109 个）
├── server/                    # Express 后端
│   ├── routes/                #   业务路由（auth/crm/follow-up/points/order...）
│   ├── routes/admin/          #   后台管理路由（RBAC 保护）
│   ├── services/payment/      #   支付网关抽象层（waffo adapter + mock）
│   ├── migrations/            #   数据库迁移 001-010（启动自动执行，幂等）
│   ├── seeds/                 #   种子数据
│   ├── middleware/            #   认证 / RBAC 中间件
│   ├── scheduler.js           #   定时任务（订单过期标记等）
│   └── test/                  #   node --test 测试（45 个）
├── docs/                      # REQUIREMENTS.md 需求文档 / PLAN.md 开发计划
├── DEPLOY.md                  # Docker 部署指南
└── docker-compose.yml         # mysql + api + web(nginx) 编排
```

## 快速启动（本地开发）

```bash
# 安装全部依赖
npm run install:all

# 配置后端环境变量（开发默认值可直接跑 mock 支付渠道）
cp server/.env.example server/.env

# 同时启动前后端（前端 5173，后端 3001）
npm run dev
```

访问 `http://localhost:5173`。首次启动自动建表并灌入种子数据。

### 环境变量

| 变量 | 说明 |
|------|------|
| `DB_HOST` / `DB_USER` / `DB_PASS` / `DB_NAME` | MySQL 连接 |
| `JWT_SECRET` / `REFRESH_SECRET` / `ADMIN_SECRET` | 令牌密钥（生产模式缺失拒绝启动） |
| `RATE_LIMIT_LOGIN_MAX` | 登录限流阈值（调试期可调大） |
| `UPLOAD_DIR` | 上传文件目录 |

## 测试与检查

```bash
# 后端测试（45 个）
npm test --prefix server

# 前端测试（109 个）
npm test --prefix client

# 后端 lint
npm run lint --prefix server

# 前端构建验证
npm run build --prefix client
```

## 生产部署

使用 Docker Compose 一键部署：

```bash
cp .env.docker.example .env   # 填入强随机密钥（openssl rand -hex 32）
docker compose up -d --build
```

nginx 托管前端静态资源并反代 `/api`、`/uploads` 到 api 服务；MySQL 数据与上传文件独立 volume 持久化。完整步骤、HTTPS 接入、上线后支付配置切换、备份恢复命令见 [DEPLOY.md](DEPLOY.md)，部署要点与运维排错也在其中。

## 相关文档

- [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) — 开发需求文档
- [docs/PLAN.md](docs/PLAN.md) — 开发计划与里程碑
- [DEPLOY.md](DEPLOY.md) — 部署指南
