# 全功能与需求核查报告（Feature Audit）

Feature Name: project-feature-audit
Updated: 2026-09-05
基准规格: `hotel-order-follow-platform/requirements.md` §4/§5/§6/§10、`2026-08-26-wechat-miniapp`、`announcement-bulletin`
核查对象: `server/`、`miniapp/src/`、`admin-pc/src/`
方法: 规格逐条拆解 → 代码点名验证（两个独立探索代理并行比对 + 人工复核 P0 论断，全部证据为文件:行号）

---

## 一、总体结论

| 域 | 模块数 | 完全落地 | 有真实缺陷或缺口 |
|---|---|---|---|
| 用户端 6.1 | 8 | 登录/用户中心、积分与会员（基本） | 跟单中心、购买支付、CRM、投稿、邀请排行、通知客服 |
| 后台 6.2 | 10 | 分类/标签/Banner/公告、等级配置、系统参数（主体）、充值对账退款（超规格亮点） | 权限体系、会员管理、订单管理、数据统计、通知配置 |

核心链路（注册→发布→购买→CRM→跟进→分佣→等级/信用闭环、充值→对账→退款记账）已完整可用。
缺口集中在三类：资金规则偏差、假功能（前端可操作但后端无效）、规格列点未做或只做半。

---

## 二、P0：资金正确性与假功能（已人工复核确认）

| # | 问题 | 证据 | 影响 |
|---|---|---|---|
| P0-1 | 分佣公式与规格 5.10 偏差且比例假配置：实现为 `净额 × 0.40 × (1+等级加成)`，规格为 `净额 × (1+等级加成)`；`platform_commission_rate` 配置可保存但计算硬编码 0.20 | server/services/level.service.js:90-94,124；server/routes/order.routes.js:128；seeds/seed.js:27 | 卖家实际到手仅约规格的 40%；改配置不改变资金流 |
| P0-2 | CSV 批量导入把 `adminId` 写入 `opportunities.user_id`（外键指向 users），管理员 id=1 恰好撞真实用户，投稿归属与分佣流向错挂 | server/routes/admin/import.routes.js:78；server/migrations/001_init.js:93 | 静默数据污染，导入商机的分佣进了撞库用户口袋 |
| P0-3 | 会员封禁/解封假生效：后台 PUT /users/:id 只处理 nickname/company，前端发 `{status:'banned'}` 被静默忽略；登录侧封禁逻辑（auth 403）永远等不到后台触发 | server/routes/admin/user.routes.js:111-115；admin-pc/src/views/UsersView.vue:204；miniapp/src/pages/admin/users.vue:140 | 后台最核心管控手段失效 |
| P0-4 | `/stats/me` 与 `/invitations/me` 把 query() 返回的数组当对象取 `.total`（db.js 的 query 返回 rows 数组），恒为 0；首页"我的投稿/累计收益"全 0 显示 | server/routes/stats.routes.js:41-47；server/routes/invitation.routes.js:21-34；server/db.js:26-30 | 用户侧统计长期为 0 |
| P0-5 | 积分过期 SQL 按 `delta > 0` 全量选中，把"充值积分永久有效"（规格 5.2）的充值流水也计入过期 | server/scheduler.js:49-55 | 用户付费资产可被系统清零 |

## 三、P1：安全与数据一致性缺陷

| # | 问题 | 证据 |
|---|---|---|
| P1-1 | 信用分变动流水写入越界枚举：`helpful_mark`、`penalty` 不在 `user_credits`/`points_logs` 枚举内（strict 模式 SQL 报错，非 strict 静默截断） | server/routes/follow-up.routes.js:229；server/routes/opportunity.routes.js:584 vs 001_init.js:159,264 |
| P1-2 | 购买 +2 信用分只 UPDATE users 不写变动记录，用户端记录页缺失该类 | server/routes/order.routes.js:143-147 |
| P1-3 | 用户列表 count 不应用筛选条件，total 恒为全量 | server/routes/admin/user.routes.js:39 |
| P1-4 | 摘要审核不写 `audit_admin_id`（审核人不留痕），驳回原因前端不采集 | server/routes/admin/audit.routes.js:58-61；admin-pc/src/views/AuditView.vue:99 |
| P1-5 | support 角色在 index.js 任何路由组都未授权，该角色登录后访问一切数据接口均 403 | server/index.js:144-169；migrations/013_security_guards.js:23 |
| P1-6 | 权限点（role_permissions + RolesView 勾选 UI）在全鉴权链零消费，requireRole 只认角色名 | server/middleware/require-role.js:5-12 |

## 四、P2：规格列点未实现（按模块）

### 用户端 6.1

- 6.1.2 市场情报"公开摘要对所有人可见"未实现（未购买者拿不到 descriptionPublic）；标签筛选未接列表接口；"机会跟单"发现位无
- 6.1.3 超 1 年跟单购买提示无；余额不足无"去充值"引导；充值档位前端硬编码非后台可配
- 6.1.4 CRM 下次跟进时间排序无；一键投稿有后端（POST /crm/:id/publish）无前端入口；跟进到期通知无
- 6.1.5 投稿表单缺"预计有效期"字段（表有列、详情读、写入不接收）；相似度提示为"先发布后提示"而非确认拦截；投稿 +50 上架奖励积分未接
- 6.1.7 排行榜周期参数 period 接收后被忽略（无周榜/总榜差异）；退榜开关无（无列无接口）
- 6.1.8 规格 11 种通知场景全部未接（全 server 唯一自动写入点是"进展被举报下架"）
- 登录协议为被动文案无强制勾选；邀请码无手动输入框

### 后台 6.2

- 6.2.1 登录日志无（表、写入、查询均无）
- 6.2.2 跟单合并、后台相似检测工具、后台市场情报查看无；列表缺分类/时间/价格维度
- 6.2.3 举报摘要处理无后台端点（数据已落库 follow_up_share_invalid_marks）
- 6.2.4 订单导出无；时间/用户/商机会点筛选无；详情引用不存在的 order_no
- 6.2.5 会员详情无购买/投稿/跟进/邀请记录
- 6.2.6 奖励积分发放量、积分流通健康度、分佣记录独立查询无；PointsView 筛选项 `purchase_income` 与枚举不符恒空
- 6.2.7 等级权益说明字段无
- 6.2.8 积分过期提醒天数配置及提前提醒任务无
- 6.2.9 通知模板/通知渠道（微信订阅消息、短信）/通知场景开关/客服配置全部无（站内群发已有）
- 6.2.10 健康指标整组（积分趋势、购买率、无效率趋势、共享率、有用率、首购转化率、DAU/MAU）与财务趋势图组（充值/消耗/抽成/分佣时间序列）、后台版各类排行未实现；价格分布档硬编码

### 业务规则 5.x

- 5.7：信用分 60~80 投稿转审核（credit_review_threshold 有配置无消费）、周活跃 +1、被举报确认 -3 未实现
- 5.2：过期前 N 天提醒未实现（关联 P0-5）

## 五、超规格亮点（已落地，未回写规格）

1. 充值对账三件套 summary/sync/refund + 双端页面 + 审计（server/routes/admin/recharge.routes.js:74-266）
2. 公告管理完整闭环（announcement-bulletin 规格已覆盖）
3. PC 独立后台 admin-pc（22 视图）
4. 管理员自助改密 PUT /auth/password + 限流 + 审计
5. 账号锁定、token_version 作废、配置密钥打码、支付多适配器热配置

## 六、建议修复顺序

1. 资金类 P0（P0-1 分佣公式与抽成接线、P0-2 导入归属、P0-5 过期豁免充值）
2. 假功能 P0（P0-3 封禁、P0-4 stats 取数）
3. P1 安全一致性（枚举越界、审核留痕、support 角色、权限点裁决：接线或删除）
4. P2 通知场景（影响用户感知最大的整块空白）、举报处理台、订单导出
5. 规格回写：分佣公式、admin-pc、充值对账应把结论同步进 requirements/design

---

## 七、处置记录（2026-09-05 第二轮）

复核修正：P0-4 中 `/invitations/me` 实际用 `queryOne`（返回行对象），非缺陷，仅 `/stats/me` 真实；审计新增发现 PC 审核页按钮条件误用 `item.status`（跟进状态枚举）致按钮永不渲染——已一并修复。

口径裁定（保持线上资金分配不变）：
- 分佣以**实现为事实基准**：`分佣 = 净额 × 基准比例(40%) × (1+等级加成)`，基准与抽成均改为 system_configs 可配并即时生效；规格 §5.10 已回写
- RBAC 简化为**纯角色制**，权限点（role_permissions/勾选 UI）保留为预留能力，不再作为缺陷追踪
- 客服角色获得明确权限面：会员管控+摘要审核+类目/标签/通知；规格 §4.2 已回写

已修复（回归 `server/test/admin-fixes.test.js` 6 项全绿，全量 npm test 通过）：

| 项 | 修复 | 文件 |
|---|---|---|
| P0-1 | `getPlatformCommissionRate`/`getSellerCommissionBaseRate` 配置化，抽成与基准即改即生效；分佣记录 `platform_rate`/`level_bonus` 用真实计算值 | level.service.js、order.routes.js、configs 种子、ConfigsView |
| P0-2 | CSV 新增「发布人用户ID」必填列并校验用户存在，禁止静默挂管理员 | admin/import.routes.js、OpportunityImportView |
| P0-3 | PUT /users/:id 支持 status（active/banned 枚举校验），两端封禁按钮真实生效；登录侧既有的 banned 拒绝逻辑恢复可达 | admin/user.routes.js |
| P0-4 | `/stats/me` 改按行数组取数并 Number() 归一 | stats.routes.js |
| P0-5 | 过期 SQL 限定 `source_type IN (奖励类六种)`，充值/退款积分永久有效 | scheduler.js |
| P1-3 | 用户列表 count 复用筛选条件 | admin/user.routes.js |
| P1-4 | 审核写 `audit_admin_id`；后端支持 status=''/all 查全部；PC 审核页状态列拆分 + 驳回原因输入 + 按钮条件修正 | admin/audit.routes.js、AuditView.vue、ConfirmDialog.vue |
| P1-5 | CS 角色组接入 users/audit/categories/tags/notifications 五个挂载 | index.js |
| 附加 | 购买 +2 信用分补写 user_credits 流水；`helpful_mark` 修正为枚举内 `share_helpful`；审核列表「全部」tab 可用 | order.routes.js、follow-up.routes.js |

遗留（P2，按需排期）：
- 11 种通知场景接线、登录日志、举报后台处理台、订单导出、CRM 一键投稿前端入口、投稿有效期字段、周活跃+1/信用阈值、排行榜 period、健康指标与财务趋势图组
- 权限点若做细粒度授权需补中间件消费链（当前以角色为粒度）
- miniapp 后台审核驳回原因输入（后端已支持，PC 已采集）
