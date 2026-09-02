# Hotel Opportunity Follow 项目文档

Hotel Opportunity Follow（HOF）是一个酒店行业商机互助平台微信小程序，连接酒店供应链供应商，通过商机发布、购买、CRM 跟进、匿名进展同步，解决行业信息不对称问题。

**快速链接**: [架构](./ARCHITECTURE.md) | [接口](./INTERFACES.md) | [开发者指南](./DEVELOPER_GUIDE.md)

---

## 核心文档

### [架构](./ARCHITECTURE.md)
系统设计、技术栈、组件结构和数据流程。从这里开始了解系统如何运作。

### [接口](./INTERFACES.md)
公开 API、认证方式、请求/响应格式、管理后台接口。集成或使用此系统的参考。

### [开发者指南](./DEVELOPER_GUIDE.md)
环境搭建、开发工作流、编码规范和常见任务。贡献者必读。

---

## 模块

| 模块 | 描述 | README |
|------|------|--------|
| `server/` | Express 后端服务（路由/服务/中间件/迁移） | [README](./模块/后端服务.md) |
| `miniapp/` | uni-app 前端小程序（页面/组件/API/状态管理） | [README](./模块/前端小程序.md) |
| `server/routes/` | 后端路由层（用户端 16 + 管理后台 18 个模块） | [README](./模块/API层.md) |
| `server/services/` | 业务服务层（等级/支付/相似度/微信/审计等） | [README](./模块/服务层.md) |

---

## 核心概念

理解这些领域概念有助于导航代码库：

| 概念 | 描述 |
|------|------|
| [商机](./专有概念/商机.md) | 平台核心标的，供应商发布酒店项目需求，购买者解锁详情 |
| [CRM 商机](./专有概念/CRM商机.md) | 购买者个人客户管理，跟进记录 + 匿名进展同步 |
| [会员等级](./专有概念/会员等级.md) | 用户成长体系（普通/银牌/金牌/达人），影响折扣与特权 |
| [信用分](./专有概念/信用分.md) | 用户信誉量化（0-100），负面行为扣分，低于阈值封禁 |
| [积分](./专有概念/积分.md) | 平台虚拟货币，购买/充值/奖励/过期机制 |

---

## 入门指南

### 项目新人？

按此路径学习：
1. **[架构](./ARCHITECTURE.md)** - 了解全局
2. **[核心概念](#核心概念)** - 学习领域术语
3. **[开发者指南](./DEVELOPER_GUIDE.md)** - 搭建环境
4. **[接口](./INTERFACES.md)** - 探索公开 API

### 需要集成？

1. **[接口](./INTERFACES.md)** - API 契约和认证
2. **[架构](./ARCHITECTURE.md)** - 系统边界和数据流

### 首次贡献？

1. **[开发者指南](./DEVELOPER_GUIDE.md)** - 搭建和工作流
2. **[后端服务](./模块/后端服务.md)** - 路由与数据层
3. **[前端小程序](./模块/前端小程序.md)** - 页面与组件

---

## 快速参考

### 命令

```bash
# 后端启动
cd server && npm run dev

# 前端 H5 开发
cd miniapp && npm run dev

# 前端微信小程序
cd miniapp && npx uni

# 后端测试
cd server && npm test

# 前端测试
cd miniapp && NODE_PATH=$(npm root -g) npx vitest run

# 代码检查
npm run lint
```

### 重要端口

| 服务 | 端口 | 说明 |
|------|------|------|
| 后端 API | 3001 | Express HTTP 服务 |
| 前端 H5 | 5174 | Vite 开发服务器（代理 /api → 3001） |

### 测试账号

| 账号 | 密码 | 说明 |
|------|------|------|
| 1398051534 | pass1234 | 用户 ID 169，CRM 中有商机 295 |
| 13980518751 | pass1234 | 用户 ID 170，CRM 中有商机 294 |

### 重要文件

| 文件 | 目的 |
|------|------|
| `server/index.js` | 后端入口，初始化 DB、迁移、种子、启动服务 |
| `server/db.js` | MySQL 连接池与查询工具 |
| `server/config.js` | 环境变量加载与全局配置 |
| `miniapp/src/pages.json` | 前端路由与 tabBar 配置 |
| `miniapp/src/common/request.js` | 统一请求层（token 刷新、重试） |
| `miniapp/src/api/index.js` | 用户端 API 方法集合 |
| `miniapp/src/admin/adminApi.js` | 管理后台 API 方法集合 |
