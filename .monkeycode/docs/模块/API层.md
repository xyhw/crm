# API 层（routes/ + api/）

后端路由层负责接收 HTTP 请求、认证授权、参数校验、调用服务层、返回统一 JSON 响应。前端 API 层封装所有后端接口，处理 token、重试、错误。

## 后端路由结构

```
server/routes/
├── auth.routes.js             # 认证：微信登录/注册/登录/密码重置/用户信息
├── opportunity.routes.js      # 商机：列表/详情/发布/编辑/标记无效/相似检测
├── order.routes.js            # 订单：购买/我的订单
├── points.routes.js           # 积分：余额/流水/充值/支付回调
├── follow-up.routes.js        # 跟进：新增/列表/同步进展/点赞/举报/审核
├── crm.routes.js              # CRM：列表/详情/新增/投稿
├── reminders.routes.js        # 提醒：今日/逾期/即将到期
├── notification.routes.js     # 通知：列表/已读
├── credits.routes.js          # 信用分
├── rankings.routes.js         # 排行榜
├── banner.routes.js           # Banner（前端已停用展示）
├── announcements.routes.js    # 公告
├── agreement.routes.js        # 协议
├── stats.routes.js            # 统计
├── upload.routes.js           # 上传
└── admin/                     # 管理后台路由
    ├── auth.routes.js         # 管理员登录
    ├── audit-log.routes.js    # 操作日志
    ├── role.routes.js         # 角色/权限/管理员
    ├── admins.routes.js       # 管理员 CRUD
    ├── config.routes.js       # 系统配置
    ├── level.routes.js        # 会员等级
    ├── opportunity.routes.js  # 商机管理
    ├── user.routes.js         # 用户管理
    ├── audit.routes.js        # 进展审核
    ├── category.routes.js     # 分类管理
    ├── tag.routes.js          # 标签管理
    ├── notification.routes.js # 通知推送
    ├── upload.routes.js       # 后台上传
    ├── import.routes.js       # CSV 批量导入
    ├── banner.routes.js       # Banner 管理
    ├── announcements.routes.js # 公告管理
    ├── order.routes.js        # 订单管理
    ├── points.routes.js       # 积分流水
    ├── finance.routes.js      # 财务统计
    └── stats.routes.js        # 数据统计
```

## 统一响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

## 认证中间件

- `authRequired`：验证 Bearer Token → 检查用户存在且 active → 验证 token_version → 设置 `req.userId`
- `optionalAuth`：Token 有效则设置 `req.userId`，无效则继续不拦截
- `adminAuthRequired`：验证 `ADMIN_SECRET` → 检查管理员存在且 active → 查询角色列表 → 设置 `req.adminRoles`
- `requireRole(...roles)`：校验 `req.adminRoles` 是否包含至少一个所需角色

## 前端 API 封装

```
miniapp/src/api/
├── index.js           # 用户端 API（30+ 方法，统一 request 调用）
└── adminApi.js        # 管理后台 API（独立 token 管理）
```

每个 API 方法直接调用 `request(path, opts)`，自动处理：
- Bearer Token 注入
- 401 refresh 重试
- GET 网络异常重试
- 非 0 code 抛出错误

## 关键接口流程

### 商机购买流程

1. `POST /api/orders`（authRequired）
2. 验证商机存在且 active
3. 检查是否已购买（唯一索引防止重复）
4. 按等级折扣计算价格
5. 扣减积分 + 创建订单 + 记录积分流水
6. 返回实际价格、折扣率、卖家收入

### 进展同步流程

1. `POST /api/follow-ups/share`（authRequired + 购买校验）
2. 验证用户购买过该商机
3. 检查等级是否免审（`isFreeAudit`）
4. 插入 `follow_up_shares`（audit_status 为 approved 或 pending）
5. 免审通过时：奖励积分 +2，记录流水
6. 返回分享 ID 和审核状态
