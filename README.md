# 跟单互助 · 酒店供应链在线跟单系统

面向酒店从筹建到开业全链路供应链的**供应商互助平台**。覆盖装修总包、弱电总包、软装总包、酒店家具、酒店运营物资等领域，通过「投稿跟单 → 积分购买 → 跟进共享 → 分佣激励」的积分飞轮实现**人人分享，人人受益**。

> **方案A（2026-08-30 已定）**：`miniapp/`（uni-app + Vue3，编译 H5 + 微信小程序）为**唯一前端**；`client/`（React H5）已冻结，仅保留可构建状态，不再新增功能、不参与部署。

## 功能模块

### 用户端（miniapp：微信小程序 + H5）

| 模块 | 说明 |
|------|------|
| 互助大厅 | 跟单浏览 / 分类标签筛选 / 关键词搜索 / 最新最热推荐排序 |
| 发现机制 | 首页推荐（按购买偏好加权）/ 最新商机 |
| 发布跟单 | 投稿即上架，TF-IDF 相似度检测提示，图片附件上传 |
| 商机详情 | 公开字段分层 / 积分解锁完整联系方式 / 市场情报（同行进展看板） |
| 个人 CRM | 客户档案、跟进记录（7 状态状态机）、跟进分享（审核/免审分层）、提醒中心 |
| 积分与充值 | 积分明细、余额查询、在线充值（微信虚拟支付 / Waffo 收银台 / 开发 mock） |
| 社区运营 | 邀请好友（海报）、排行榜、公告、通知中心、信用分、会员等级、客服入口 |

### 管理后台（miniapp 内管理页，与 Web 后台同源接口）

RBAC 权限点模型（`role_permissions` 表驱动，超级管理员/运营/财务/客服），包含：数据看板、财务汇总、充值对账（查单补账）、用户管理、商机管理与 CSV 导入、审核流（内容审核 + 操作日志）、订单与积分流水、Banner/分类/标签/公告/通知群发、会员等级配置、协议配置、管理员与角色权限管理。

核心的**系统配置**支持在线调整支付渠道开关、默认渠道、微信虚拟支付参数（OfferID/AppKey/道具映射/推送 Token）、Waffo 凭据与环境（test/prod）、站点域名等，保存即热更新，无需重启服务。

## 技术栈

- **前端**：uni-app + Vue 3 + Pinia + Vite（编译到微信小程序与 H5）
- **后端**：Node.js 20 (ESM) + Express + MySQL 8.0（mysql2 连接池），测试用 `node --test`
- **认证**：JWT access + refresh 双令牌，登录限流 + 账号级失败锁定，bcrypt 密码哈希
- **支付**：微信小程序虚拟支付（wx.requestVirtualPayment）+ [Waffo](https://www.npmjs.com/package/@waffo/pancake-ts) 托管收银台 + webhook 原始 body 验签；内置 mock 渠道（仅非生产）
- **API 文档**：Swagger（swagger-jsdoc + swagger-ui-express）
- **CI**：GitHub Actions（lint + 后端集成测试含 MySQL 服务 + 双前端构建）
- **部署**：Docker Compose 三服务编排（见下文）

## 目录结构

```
.
├── miniapp/                   # 唯一前端：uni-app (H5 + 微信小程序)
│   ├── src/api/               #   API 封装（与后端接口一一对应）
│   ├── src/pages/             #   用户端页面（46 页）
│   ├── src/pages/admin/       #   管理后台页面（22 页）
│   ├── src/common/            #   request/payment/constants（H5 与小程序条件编译）
│   ├── Dockerfile / nginx.conf#   H5 生产镜像（nginx 反代 /api、/uploads）
│   └── DEPLOY.md              #   小程序发布流程与上线参数清单
├── server/                    # Express 后端
│   ├── routes/                #   业务路由（auth/opportunity/order/points/follow-up/crm...）
│   ├── routes/admin/          #   后台管理路由（权限点保护）
│   ├── services/              #   支付网关/积分账务/市场情报/等级/相似度/结构化日志等服务层
│   ├── migrations/            #   数据库迁移 001-018（幂等，启动自动执行）
│   ├── seeds/                 #   种子数据（分类/等级/系统配置/默认管理员）
│   ├── middleware/            #   限流/分页钳制/权限点/请求 ID
│   ├── lib/                   #   统一响应助手 / 列表查询构造器
│   ├── scheduler.js           #   定时任务（等级重算/积分过期清理/查单兜底/对账巡检）
│   └── test/                  #   node --test 集成测试
├── client/                    # （已冻结）旧 React 前端，仅保留可构建，不参与部署
├── docs/                      # REQUIREMENTS.md 需求文档 / PLAN.md 开发计划与 roadmap
├── deploy/                    # （已废弃）旧备用部署方案，仅存档
├── DEPLOY.md                  # Docker 部署指南
└── docker-compose.yml         # mysql + api + web(miniapp H5) 编排
```

## 快速启动（本地开发）

```bash
# 安装全部依赖
npm run install:all

# 配置后端环境变量（开发默认值可直接跑 mock 支付渠道）
cp server/.env.example server/.env

# 同时启动后端(3001)与 miniapp H5(5174)
npm run dev
```

H5 访问 `http://localhost:5174`（vite 代理 `/api`、`/uploads` 到 3001）。首次启动自动建表并灌入种子数据。

小程序调试：`npm run dev:mp --prefix miniapp` 后用微信开发者工具导入 `miniapp/dist/dev/mp-weixin`（详见 [miniapp/DEPLOY.md](miniapp/DEPLOY.md)）。

### 环境变量（后端）

| 变量 | 说明 |
|------|------|
| `DB_HOST` / `DB_USER` / `DB_PASS` / `DB_NAME` | MySQL 连接 |
| `JWT_SECRET` / `REFRESH_SECRET` / `ADMIN_SECRET` | 令牌密钥（生产模式缺失拒绝启动） |
| `ADMIN_INIT_PASSWORD` | 首次启动创建管理员的初始密码（生产必填，否则拒绝创建默认管理员） |
| `WX_MINIAPP_APPID` / `WX_MINIAPP_SECRET` | 微信登录与手机号能力 |
| `PAY_*` | 支付渠道参数（可被管理后台 system_configs 覆盖，支持热更新） |
| `RATE_LIMIT_LOGIN_MAX` | 登录限流阈值（调试期可调大） |
| `UPLOAD_DIR` | 上传文件目录 |

## 测试与检查

```bash
# 后端测试（集成测试，需先启动服务与 MySQL）
npm test --prefix server

# 后端 lint
npm run lint --prefix server

# 前端构建验证（H5 与小程序）
npm run build --prefix miniapp
npm run build:mp --prefix miniapp
```

推送即触发 GitHub Actions：lint + 后端测试（CI 内起 mysql:8.0 服务）+ 双前端构建。

## 生产部署

使用 Docker Compose 一键部署（web 服务即 miniapp H5）：

```bash
cp .env.docker.example .env   # 填入强随机密钥（openssl rand -hex 32）
docker compose up -d --build
```

nginx 托管 H5 静态资源并反代 `/api`、`/uploads` 到 api 服务；MySQL 数据与上传文件独立 volume 持久化。完整步骤、HTTPS 接入、上线后支付配置切换、定时备份与恢复、故障排查见 [DEPLOY.md](DEPLOY.md)。

## 相关文档

- [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) — 开发需求文档
- [docs/PLAN.md](docs/PLAN.md) — 开发计划与 roadmap
- [DEPLOY.md](DEPLOY.md) — 部署指南
- [miniapp/DEPLOY.md](miniapp/DEPLOY.md) — 小程序发布流程
- [miniapp/DEPLOY-CHECKLIST.md](miniapp/DEPLOY-CHECKLIST.md) — 小程序上线参数清单
