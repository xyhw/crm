# 接口文档

## 认证方式

### 用户端
- **Bearer Token**：登录后获取 `token`（7天）+ `refreshToken`（30天）
- 请求头：`Authorization: Bearer <token>`
- 401 时自动 refresh 重试，refresh 失败则跳转登录
- 部分接口可选认证（opportunities 列表/详情），未登录时脱敏展示

### 管理后台
- **Bearer Token**：`ADMIN_SECRET` 签发的管理员 Token
- 请求头：`Authorization: Bearer <admin_token>`
- 401 时跳转 `/pages/admin/login`

---

## 用户端接口（/api）

### 认证（/api/auth）

| 方法 | 路径 | 认证 | 参数 | 返回值 | 说明 |
|------|------|------|------|--------|------|
| POST | `/api/auth/wechat-login` | 公开 | `{ code }` | `{ bound, openid, unionid }` 或 `{ bound: true, token, refreshToken, user }` | 微信登录，未绑定手机号时返回 bound: false |
| POST | `/api/auth/bind-wechat` | 公开 | `{ openid, unionid, phone, nickname, inviteCode }` | `{ code, data: { token, refreshToken, user }, message }` | 绑定微信并登录 |
| POST | `/api/auth/phone` | 公开 | `{ code }` | `{ code, data: { phone } }` | 微信手机号解密 |
| POST | `/api/auth/register` | 公开 | `{ phone, password, nickname, email?, company?, category?, inviteCode? }` | `{ code, data: { token, refreshToken, user }, message }` | 注册 |
| POST | `/api/auth/login` | 公开（限流） | `{ phone, password }` | `{ code, data: { token, refreshToken, user } }` | 密码登录 |
| POST | `/api/auth/refresh` | 公开 | `{ refreshToken }` | `{ code, data: { token, refreshToken } }` | 刷新 Token |
| GET | `/api/auth/me` | 必选 | - | `{ code, data: user }` | 当前用户信息 |
| PUT | `/api/auth/me` | 必选 | `{ nickname?, avatar?, company?, category?, bio?, qualifications?, cases? }` | `{ code, data: user, message }` | 更新个人资料 |
| POST | `/api/auth/send-reset-code` | 公开（限流） | `{ email }` | `{ code, message }` | 发送重置验证码 |
| POST | `/api/auth/reset-password` | 公开（限流） | `{ email, code, newPassword }` | `{ code, message }` | 重置密码 |
| PUT | `/api/auth/change-password` | 必选 | `{ oldPassword, newPassword }` | `{ code, message }` | 修改密码 |

### 商机（/api/opportunities）

| 方法 | 路径 | 认证 | 参数 | 返回值 | 说明 |
|------|------|------|------|--------|------|
| GET | `/api/opportunities` | 可选 | query: `{ category?, keyword?, status=active, page=1, pageSize=10, sort=newest, mine?, boostCategory? }` | `{ code, data: { list, total, page, pageSize } }` | 商机列表，未登录脱敏 |
| GET | `/api/opportunities/:id` | 可选 | - | `{ code, data: opportunity }` | 商机详情，未登录仅展示公开字段 |
| POST | `/api/opportunities` | 必选 | body: `{ title, categoryId, descriptionFull, contactName, contactPhone, city, address, brand, wechat, stage, price, tags?, attachments? }` | `{ code, data: { id, title, similarOpportunities }, message }` | 发布商机，自动检测相似度 |
| PUT | `/api/opportunities/:id` | 必选（仅本人） | body: `{ title?, categoryId?, descriptionFull?, contactName?, contactPhone?, city?, address?, brand?, wechat?, stage?, price?, descriptionPublic?, attachments? }` | `{ code, message }` | 编辑商机 |
| POST | `/api/opportunities/:id/invalid-mark` | 必选（仅购买者） | `{ reason, reasonText? }` | `{ code, message }` | 标记商机无效 |

### 订单（/api/orders）

| 方法 | 路径 | 认证 | 参数 | 返回值 | 说明 |
|------|------|------|------|--------|------|
| POST | `/api/orders` | 必选 | `{ opportunityId }` | `{ code, data: { actualPrice, discountRate, sellerIncome }, message }` | 购买商机，按等级折扣计价 |
| GET | `/api/orders/my` | 必选 | query: `{ page=1, pageSize=10 }` | `{ code, data: { list, total, page, pageSize } }` | 我的购买记录 |

### 积分（/api/points）

| 方法 | 路径 | 认证 | 参数 | 返回值 | 说明 |
|------|------|------|------|--------|------|
| GET | `/api/points/balance` | 必选 | - | `{ code, data: { balance, total_recharged, total_consumed, total_expired } }` | 积分余额 |
| GET | `/api/points/logs` | 必选 | query: `{ type?, page=1, pageSize=20 }` | `{ code, data: { list, total, page, pageSize } }` | 积分流水 |
| POST | `/api/points/recharge` | 必选 | `{ amount, channel? }` | `{ code, data, message }` | 充值积分 |
| GET | `/api/points/recharge/order/:orderNo` | 必选 | - | `{ code, data: order }` | 查询充值订单 |
| POST | `/api/points/recharge/mock-pay/:orderNo` | 必选（仅开发） | - | `{ code, data, message }` | Mock 支付（开发环境） |
| POST | `/api/points/recharge/notify/:channel` | 公开 | - | 渠道回调响应 | 支付渠道异步通知 |
| GET | `/api/points/recharge/channels` | 必选 | - | `{ code, data: { channels, defaultChannel } }` | 可用充值渠道 |

### 跟进（/api/follow-ups）

| 方法 | 路径 | 认证 | 参数 | 返回值 | 说明 |
|------|------|------|------|--------|------|
| POST | `/api/follow-ups` | 必选 | `{ crmOpportunityId, status?, contentPrivate, nextFollowDate? }` | `{ code, data: { id }, message }` | 新增跟进记录 |
| GET | `/api/follow-ups/:crmOpportunityId` | 必选 | - | `{ code, data: followUps }` | 获取跟进记录列表 |
| POST | `/api/follow-ups/share` | 必选（仅购买者） | `{ followUpId?, opportunityId, status, summary? }` | `{ code, data: { id, auditStatus }, message }` | 同步进展（免审则自动过审并奖励） |
| POST | `/api/follow-ups/helpful` | 必选（仅购买同商机者） | `{ shareId }` | `{ code, message }` | 标记进展有用（+1 积分/信用分） |
| POST | `/api/follow-ups/report` | 必选（仅购买同商机者） | `{ shareId, reason, reasonText? }` | `{ code, message }` | 举报进展无效（达阈值自动下架） |

### CRM（/api/crm）

| 方法 | 路径 | 认证 | 参数 | 返回值 | 说明 |
|------|------|------|------|--------|------|
| GET | `/api/crm` | 必选 | query: `{ status?, keyword?, page=1, pageSize=10 }` | `{ code, data: { list, total, page, pageSize } }` | 我的 CRM 列表 |
| GET | `/api/crm/:id` | 必选 | - | `{ code, data: crm }` | CRM 详情（含跟进记录、同行进展） |
| POST | `/api/crm` | 必选 | `{ title, categoryName?, city?, hotelName?, description?, contactName?, contactPhone? }` | `{ code, data: { id, opportunityId }, message }` | 手动录入商机到 CRM |
| POST | `/api/crm/:id/publish` | 必选（manual 来源） | `{ price, descriptionFull? }` | `{ code, message }` | 从 CRM 投稿到商机市场 |

### 提醒（/api/reminders）

| 方法 | 路径 | 认证 | 参数 | 返回值 | 说明 |
|------|------|------|------|--------|------|
| GET | `/api/reminders` | 必选 | query: `{ type=today }`（today/overdue/upcoming） | `{ code, data: { list, counts: { today, overdue, upcoming } } }` | 跟进提醒列表，含各分类计数 |

### 通知（/api/notifications）

| 方法 | 路径 | 认证 | 参数 | 返回值 | 说明 |
|------|------|------|------|--------|------|
| GET | `/api/notifications` | 必选 | query: `{ type?, page=1, pageSize=20 }` | `{ code, data: { list, total, unreadCount, unreadByType } }` | 通知列表，含总未读与分类未读 |
| PUT | `/api/notifications/:id/read` | 必选 | - | `{ code, message }` | 标记单条已读 |
| PUT | `/api/notifications/read-all` | 必选 | - | `{ code, message }` | 全部标记已读 |

### 其他接口

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/stats/me` | 必选 | 个人统计 |
| GET | `/api/credits` | 必选 | 信用分及变动记录 |
| GET | `/api/invitations/me` | 必选 | 我的邀请信息 |
| GET | `/api/banners` | 公开 | Banner 列表（前端已停用展示） |
| GET | `/api/rankings` | 可选 | 排行榜（达人榜/贡献榜） |
| GET | `/api/announcements` | 公开 | 公告列表 |
| GET | `/api/announcements/:id` | 公开 | 公告详情 |
| GET | `/api/agreement/:type` | 公开 | 协议内容 |
| POST | `/api/upload` | 必选 | 单文件上传 |
| POST | `/api/upload/multiple` | 必选 | 多文件上传 |
| POST | `/api/points/recharge/notify/waffo` | 公开（验签） | Waffo 支付回调 |

---

## 管理后台接口（/api/v1/admin）

所有管理接口除登录外均需 `adminAuthRequired` + `requireRole(...)` 双重校验。

| 路径前缀 | 文件 | 功能 | 角色要求 |
|---------|------|------|---------|
| `/api/v1/admin/auth` | auth.routes.js | 登录/获取当前管理员 | 登录公开，/me 需 adminAuth |
| `/api/v1/admin/dashboard` | stats.routes.js | 仪表盘数据 | operation/finance/super_admin |
| `/api/v1/admin/opportunities` | opportunity.routes.js | 商机列表/详情/上下架 | operation/super_admin |
| `/api/v1/admin/opportunities/import` | import.routes.js | CSV 批量导入商机 | operation/super_admin |
| `/api/v1/admin/users` | user.routes.js | 用户列表/详情/编辑/调积分调信用 | operation/super_admin |
| `/api/v1/admin/audit` | audit.routes.js | 待审核进展列表/审核通过驳回 | operation/super_admin |
| `/api/v1/admin/categories` | category.routes.js | 分类 CRUD | operation/super_admin |
| `/api/v1/admin/tags` | tag.routes.js | 标签 CRUD | operation/super_admin |
| `/api/v1/admin/notifications` | notification.routes.js | 发送通知/通知历史 | operation/super_admin |
| `/api/v1/admin/banners` | banner.routes.js | Banner CRUD | operation/super_admin |
| `/api/v1/admin/announcements` | announcements.routes.js | 公告 CRUD | operation/super_admin |
| `/api/v1/admin/orders` | order.routes.js | 订单列表 | finance/super_admin |
| `/api/v1/admin/points` | points.routes.js | 积分流水列表 | finance/super_admin |
| `/api/v1/admin/finance` | finance.routes.js | 财务统计 | finance/super_admin |
| `/api/v1/admin/stats` | stats.routes.js | 统计数据/趋势/分布 | operation/finance/super_admin |
| `/api/v1/admin/roles` | role.routes.js | 角色/权限/管理员管理 | super_admin |
| `/api/v1/admin/admins` | admins.routes.js | 管理员 CRUD | super_admin |
| `/api/v1/admin/audit-logs` | audit-log.routes.js | 操作日志 | super_admin |
| `/api/v1/admin/configs` | config.routes.js | 系统配置查询/更新 | super_admin |
| `/api/v1/admin/levels` | level.routes.js | 会员等级配置 | super_admin |
| `/api/v1/admin/upload` | upload.routes.js | 管理后台上传 | operation/super_admin |

---

## 数据格式约定

### 统一响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

- `code`：0 表示成功，非 0 表示失败
- `message`：操作结果描述
- `data`：响应数据

### 分页格式

```json
{
  "list": [ ... ],
  "total": 100,
  "page": 1,
  "pageSize": 10
}
```

### 错误码

| code | 含义 | 典型场景 |
|------|------|---------|
| 0 | 成功 | - |
| 400 | 参数错误 | 缺少必填字段、枚举值非法 |
| 401 | 未认证 | Token 过期/无效 |
| 403 | 权限不足 | 非本人资源、未购买同商机 |
| 404 | 资源不存在 | 商机/订单/跟进不存在 |
| 409 | 重复操作 | 已标记有用/已举报 |
| 500 | 服务器错误 | 数据库异常 |
