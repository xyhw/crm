# 开发计划

> 更新日期：2026-08-25 · 当前 HEAD：`72e63dc`（main，已推送 origin）

## 已完成

### M1 基础框架与核心业务
- [x] 前后端工程搭建（React 18 + Vite H5 / Express + MySQL）
- [x] 认证体系：注册/登录、JWT + refresh token、登录限流
- [x] 客户 / 订单 / 跟进记录 CRUD
- [x] 跟进状态机与白名单校验（防枚举截断脏数据）
- [x] 积分体系与积分明细
- [x] 数据库 migration 001-010（幂等，启动自动执行）

### M2 支付网关集成（Waffo）
- [x] Waffo adapter（checkout.authenticated.create + webhook 验签）+ mock 渠道双轨
- [x] 收银台预填买家信息（邮箱后端自动取 users.email），语言 zh-Hans
- [x] webhook 回调 `express.raw()` 原始验签入账
- [x] 支付结果页三态（成功/失败/超时）+ 前端轮询 90×2s
- [x] 充值订单超时过期标记
- [x] 渠道选择收敛到管理后台（pay_default_channel），用户端无渠道选择
- [x] Waffo 商品持久化（productId 写 system_configs，重启不重复建品）
- [x] 管理后台系统配置：支付开关、默认渠道、Waffo 凭据、站点域名

### M3 质量与交付
- [x] 后端测试 45 个、前端测试 109 个全部通过
- [x] 上线前检查：API 健康、DB migration 就绪、无硬编码密钥、.env 未跟踪
- [x] Docker Compose 编排（mysql healthcheck + api 自动 migration + web nginx 反代）
- [x] `.env.docker.example` 密钥模板入仓，真实 .env 全部 gitignore
- [x] 部署文档 `DEPLOY.md`（部署步骤 / 上线配置切换 / HTTPS / 运维命令 / 故障排查）

## 进行中

### M4 生产环境上线
- [ ] 腾讯云 VPS 实际部署（等用户提供 IP / SSH 凭据 / 域名）
  - 流程：装 Docker → clone → 配 `.env`（openssl rand -hex 32 生成强随机密钥）→ `docker compose up -d --build`
- [ ] HTTPS 接入（certbot 或腾讯云 CLB 挂证书）
- [ ] 上线后配置切换：
  - 管理后台填站点域名，清空 pay_waffo_success_url（当前残留 preview 地址，优先级更高会遮蔽域名拼接）
  - Waffo 平台侧 webhook URL 更新为正式域名地址
  - `pay_waffo_environment` 切 prod 并替换生产 Merchant ID / Store ID / 私钥

## 待规划

| 事项 | 说明 |
|------|------|
| README 更新 | 现有 README 描述为旧版 JSON 文件存储架构，需同步 MySQL + Docker 现状 |
| 数据备份策略 | 定时 mysqldump 到宿主机 / 对象存储（DEPLOY.md 已有手工备份命令） |
| 监控告警 | 容器健康检查告警、支付回调失败监控 |
| 积分商城 | README 规划中的礼品卡/红包兑换模块 |
| 邀请与排行榜 | spec v1.0 中规划的邀请机制、排行榜、通知中心 |
| 会员等级与信用分 | 高等级会员购买折扣、分佣比例、共享摘要免审 |

## 迭代节奏约定

- 每个功能点独立 commit，push 前跑通对应测试
- 涉及 system_configs 的改动注意管理后台保存会整体覆盖字段
- 支付相关改动必须同时验证 mock 渠道回归 + webhook 验签路径
