# 开发计划

> 更新日期：2026-09-06

## 已完成

### M1 基础框架与核心业务
- [x] 前后端工程搭建（Express + MySQL；前端经历 React H5 → uni-app 方案A 演进）
- [x] 认证体系：注册/登录、JWT + refresh token、登录限流、账号级失败锁定
- [x] 客户 / 订单 / 跟进记录 CRUD
- [x] 跟进状态机与白名单校验（防枚举截断脏数据）
- [x] 积分体系与积分明细
- [x] 数据库 migration 001-018（幂等，启动自动执行）

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
- [x] 后端测试、前端测试全量通过
- [x] Docker Compose 编排（mysql healthcheck + api 自动 migration + web nginx 反代）
- [x] `.env.docker.example` 密钥模板入仓，真实 .env 全部 gitignore
- [x] 部署文档 `DEPLOY.md`

### M3.5 微信小程序改造（方案A，2026-08-30 定案）
- [x] miniapp（uni-app + Vue3）全部用户端功能迁移 + 小程序内管理后台（22 页）
- [x] 微信登录/手机号绑定链路（待填凭据）、微信虚拟支付（requestVirtualPayment）
- [x] 方案A：miniapp 为用户端，client 冻结（2026-09-06 已移出部署链与根 scripts）；独立 PC 后台见 M3.6

### M3.6 项目体检与全面优化（2026-09-06，分支 260906-*）
- [x] P0 修复：统计页等级恒为普通、管理后台上传列名错误、财务软删过滤、client PayResult TDZ 崩溃
- [x] 安全加固：配置接口 key 白名单、审计日志敏感值脱敏（支付私钥原文落库缺陷）、
      err.message 外泄收敛、分页参数全局钳制、seed 生产环境拒绝默认管理员、fetch 超时修复
- [x] CI：GitHub Actions（lint + 集成测试含 MySQL 服务 + miniapp / admin-pc 构建）；测试凭据环境变量化
- [x] 后端重构：结构化日志（console.* 全量替换）、请求 ID、统一响应助手与列表查询构造器、
      市场情报/积分账务/浏览量去重服务化（消除 9 处账务复制）、权限点 RBAC 生效（018 回填迁移）、
      鉴权缓存、群发通知批量插入、等级重算消 N+1
- [x] 等级系统修复：等级判定顺序（原永远停在 normal）与 useful_shares 统计字段错误（status→audit_status）
- [x] 支付渠道注册表收敛（alipay/stripe 占位摘除）、微信为主渠道、默认渠道兜底解析
- [x] 部署统一：miniapp H5 Docker 化，deploy/ 废弃并归档至 archive/deploy/，PROD_API_BASE 构建期注入
- [x] 运维：定时备份脚本（archive/deploy/backup.sh）、每日对账巡检任务、DEPLOY.md 恢复演练
- [x] 独立 PC 管理后台：仓库根 `admin-pc/`（Vue3 + Vite，端口 5175），写接口同时接受 camelCase / snake_case；不合入方案 B 分佣改革与充值退款记账

## 进行中

### M4 生产环境上线
- [ ] 腾讯云 VPS 实际部署（等用户提供 IP / SSH 凭据 / 域名）
  - 流程：装 Docker → clone → 配 `.env`（openssl rand -hex 32 生成强随机密钥 + `ADMIN_INIT_PASSWORD`）→ `docker compose up -d --build`
- [ ] HTTPS 接入（certbot 或腾讯云 CLB 挂证书）
- [ ] 小程序上线参数：AppID（manifest.json）、`WX_MINIAPP_APPID/SECRET`、
      `VITE_API_BASE`（构建期注入正式 API 域名）、request/uploadFile 合法域名白名单
- [ ] 上线后配置切换：
  - 管理后台填站点域名（pay_site_base_url），**清空 pay_waffo_success_url**（当前残留 preview 地址，优先级更高会遮蔽域名拼接）
  - Waffo 平台侧 webhook URL 更新为正式域名地址
  - `pay_waffo_environment` 切 prod 并替换生产凭据；微信虚拟支付参数（OfferID/AppKey/道具映射/推送 Token）后台填入并验证发货推送

## Roadmap（按优先级，均未排期）

> 2026-09-06 需求对照结论：P0 需求全部达标；以下为 P1/P2 缺口与增强项。

| 优先级 | 事项 | 对应需求 | 说明 |
|--------|------|----------|------|
| P1 | 通知中心 15 类场景 + 模板化 | U-26 / S-10 / A-20 | 当前仅 1 类自动通知 + 后台群发；需 notification_templates 表与场景埋点（审核通过/购买成功/邀请奖励等） |
| P1 | 平台健康指标 | A-22 | 审核积压、无效率、活跃度等指标看板 |
| P1 | 订单 CSV 导出 | A-10 子项 | 后台订单/财务列表导出 |
| P2 | 排行榜周/月周期 | U-25 | 接口已收 period 参数未实现过滤，前端无切换 |
| P2 | 超一年未跟进提示 | U-10 子项 | 购买确认弹窗提示 |
| P2 | 注册邮箱后端强制 | 需求 3.1 | 前端必填后端不校验，影响支付 buyerEmail；需 DB 迁移收紧 |
| P2 | 充值档位后台可配 | 支付增强 | 档位 [50,100,200,500,1000] 前端硬编码，建议入 system_configs |
| P2 | 合并跟单 | A-06 子项 | 无效标记管理已有，缺合并工具 |
| P2 | 相似跟单检测工具 | A-07 | 管理端独立检测入口（服务已有，仅缺后台界面） |
| P3 | 积分商城 | 6.2 | 后台保留开关（points_mall_enabled），未来开启 |
| P3 | H5 商户号版微信支付 | 支付增强 | JSAPI/H5 支付需微信支付商户资料；当前微信渠道为小程序虚拟支付 |
| P3 | 订阅消息推送 | R8-5 | 后端存 openid + 订阅结果，提醒/通知推送 |
| P3 | 后端深化重构 | 技术债 | 统一错误响应全面收敛、zod 校验层、pino 替换自研 logger、上传校验去重、role.routes/admins.routes 接口整合（需配合后台页面改造） |
| P3 | client 正式删除 | 方案A | 确认无需回溯后移除目录 |
| P3 | vue-i18n 依赖清理 | 技术债 | miniapp 声明未使用；需同步更新 lockfile |

## 迭代节奏约定

- 每个功能点独立 commit，分支命名 `YYMMDD-type-描述`，push 前跑通对应测试
- 涉及 system_configs 的改动注意管理后台保存会整体覆盖字段（新增键须同步 config-registry 白名单）
- 支付相关改动必须同时验证 mock 渠道回归 + webhook 验签路径
- 后端日志已结构化（JSON lines），新增日志统一使用 services/logger.js
