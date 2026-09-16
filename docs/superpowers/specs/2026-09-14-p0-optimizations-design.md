# P0 优化设计（积分/分佣/等级/信用分）

> 日期：2026-09-14 · 状态：已与用户确认，实施中
> 来源：对照 docs/REQUIREMENTS.md v1.1 与 .monkeycode spec v1.0 逐模块核查后的差距修复

## P0-1 积分过期规则修复

**问题**：所有积分入账不设 `expires_at`，`cleanExpiredPoints` 把超 180 天的所有积极分清零，包括充值积分与分佣收益，违反需求"充值积分永久有效，仅奖励积分过期"。

**方案**：
- 入账按来源设 `expires_at`：奖励类（register_gift / invite_gift / reward 等）= `NOW() + points_expire_days`；充值 / 分佣 / 消费 / 后台人工调整 = NULL（永久）
- `cleanExpiredPoints` 重写：只清理 `expires_at <= NOW()` 的记录
- 存量补正：迁移中按来源类型给存量积极分补设 `expires_at`（用默认 180 天）
- 不追溯补偿已清零数据（生产未上线，无真实资金受影响，用户已确认）

## P0-2 分佣模型简化（用户拍板）

**问题**：`calculateSellerEarnings` 写死 `sellerEarnings = 净额 × 0.40 × (1+加成)`，投稿人仅得约 32%，剩余积分凭空消失；`commission_settlements` 写死 platform_rate=0.20、level_bonus 用 0.40 反推。

**用户决策**：购买**不考虑折扣**，会员等级**只影响分佣比例**，以激励高等级会员录入商机。

**新模型（直接比例，积分严格守恒）**：
```
用户支付   = 定价（所有等级统一原价，无折扣）
投稿人分佣 = 实付 × 等级分佣比例（member_levels.commission_rate，后台可配）
平台抽成   = 实付 − 投稿人分佣
```

**等级分佣比例**：普通 70% / 银牌 75% / 金牌 80% / 达人 85%

**配套**：
- member_levels 加 `commission_rate` 列；`purchase_discount` 全部置 1.00 且代码不再读取
- 移除 `calculateCommissionRate`（0.40 基数）与折扣逻辑；orders.discount_rate 存 1.00
- commission_settlements：platform_rate 存实际抽成比例，level_bonus 存 0
- 保留非支付权益：共享摘要免审（金牌+）、无效标记权重 3×（达人）
- 后台等级配置页 / 客户端等级页权益文案同步；测试断言同步

## P0-3 会员等级算法修正 + 活跃度复合指标（用户拍板）

**问题**：购买率=买家订单完成率（恒 100%）、有用率分母错用 CRM 数、无效率分母漏已无效商机、活跃度=CRM 跟单数（与阈值 50/100/200 不匹配）、无等级变更通知。

**新算法（保持表驱动阈值 AND 匹配）**：
| 维度 | 定义 |
|---|---|
| 投稿购买率 | 我的投稿中被购买数 / 全部已发布数 |
| 投稿无效率 | 被判无效数 / 全部已发布数 |
| 跟进有用率 | 我的共享摘要获得的有用标记数 / 我的共享摘要数（封顶 100） |
| 活跃度 | 0~100 复合分（用户拍板权重，**不含注册时长**） |

**活跃度复合分**（用户拍板 30/30/40）：
- 登录频率 30%：近 30 天登录天数 / 30（新表 `user_login_days`，登录时记一天）
- 操作频次 30%：近 30 天操作数（投稿+跟进+共享摘要+购买），≥20 次满分
- 互动贡献 40%：近 30 天共享摘要被标记有用数，≥5 次满分

**配套**：`member_levels.activity_threshold` 语义改为 0~100 分，种子与存量改为 银牌 30 / 金牌 50 / 达人 70；等级变更时插入站内通知（需求 5.6）。

## P0-4 信用分阶梯补齐（用户定位：惩戒乱发商机，按方案 a 完整实施）

**现状**：<60 拒绝投稿 ✓；-10 无效/-5 举报/+2 购买/+1 有用 ✓；累计 3 次无效封号（invalid_ban_threshold 可配）+ 标记时 <40 封禁 ✓。缺失：60~80 投稿需审核、<40 每日巡检封禁、周活跃加分。

**方案**：
- 商机加 `audit_status ENUM('none','pending','approved','rejected')` + `audit_reason`；60≤信用分<80 投稿 → pending（不上架），后台审核通过才上架、驳回带原因并通知
- 公开列表只展示 `audit_status IN ('none','approved')`；我的投稿显示待审核状态
- scheduler 每日巡检：`credit_score < 40 AND status='active'` → 封禁 + 通知
- 周活跃 +1：近 7 天登录 ≥3 天 → 每周 +1 信用分（幂等：查 user_credits `weekly_active` 本周已有则跳过）——惩戒用户的恢复路径
- -3 账号被举报扣分随举报功能延后（代码库无举报入口）

## 影响范围

- server：scheduler.js、level.service.js、routes/auth.routes.js、routes/order.routes.js、routes/opportunity.routes.js、routes/admin/*、seeds/seed.js、migrations/（新迁移）
- client：MemberLevel.jsx（权益文案）、admin/LevelConfig.jsx（分佣比例编辑）、admin 审核页（商机审核）
- 测试：更新折扣/分佣/等级相关断言，补充新行为用例
- 文档：REQUIREMENTS.md / PLAN.md 记录决策变更（购买无折扣、等级只影响分佣、积分永久规则）
