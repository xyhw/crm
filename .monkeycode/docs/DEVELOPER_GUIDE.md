# 开发者指南

## 项目目的

Hotel Opportunity Follow（HOF）是一个酒店行业商机互助平台，解决酒店供应链供应商之间信息不对称的问题。供应商可以发布、采购、跟进酒店项目商机，并通过匿名同步进展的方式，帮助同一条商机的购买者了解真实推进情况。

**核心职责**：
- 商机发布、购买、CRM 跟进管理
- 匿名进展同步与同行参考
- 积分、信用分、会员等级体系
- 管理后台运营支撑

## 环境搭建

### 前置条件

- Node.js >= 20
- MySQL >= 8.0
- npm 或 pnpm

### 安装

```bash
# 克隆仓库
git clone <repo-url>
cd hof-crm

# 安装后端依赖
cd server && npm install && cd ..

# 安装前端依赖
cd miniapp && npm install && cd ..
```

### 环境变量

复制 `.env.example` 为 `.env`，至少配置数据库连接与 JWT 密钥：

```bash
cp server/.env.example server/.env
```

生产环境必须显式设置 `JWT_SECRET`、`REFRESH_SECRET`、`ADMIN_SECRET`，否则 `config.js` 会拒绝启动。

关键环境变量：

| 变量 | 必需 | 描述 | 示例 |
|------|------|------|------|
| `DB_HOST` | 是 | 数据库主机 | `localhost` |
| `DB_USER` | 是 | 数据库用户 | `hof_user` |
| `DB_PASS` | 是 | 数据库密码 | `hof_pass_2026` |
| `DB_NAME` | 是 | 数据库名 | `hotel_order_follow` |
| `JWT_SECRET` | 生产必填 | 用户 Token 密钥 | 强随机字符串 |
| `REFRESH_SECRET` | 生产必填 | Refresh Token 密钥 | 强随机字符串 |
| `ADMIN_SECRET` | 生产必填 | 管理员 Token 密钥 | 强随机字符串 |
| `PORT` | 否 | 服务端口 | `3001` |
| `RATE_LIMIT_LOGIN_MAX` | 否 | 登录限流阈值 | `30` |
| `NODE_ENV` | 否 | 运行环境 | `development` / `production` |

### 运行

```bash
# 启动后端（自动初始化数据库、执行迁移、加载种子数据）
cd server && npm run dev

# 启动前端 H5 开发服务器（Vite，端口 5174）
cd miniapp && npm run dev

# 或启动微信小程序
cd miniapp && npx uni
```

### 运行测试

```bash
# 后端测试
cd server && npm test

# 前端测试（vitest）
cd miniapp && NODE_PATH=$(npm root -g) npx vitest run
```

### 构建前端

```bash
cd miniapp && npm run build
```

## 开发工作流

### 代码质量工具

| 工具 | 命令 | 目的 |
|------|------|------|
| ESLint | `npm run lint` | 代码检查 |
| Vitest | `npx vitest run` | 单元测试 |
| Node test | `npm test` | 后端集成测试 |

### 提交前检查

1. 前端测试通过：`cd miniapp && NODE_PATH=$(npm root -g) npx vitest run`
2. 后端测试通过：`cd server && npm test`
3. 代码检查通过：`npm run lint`

### 分支策略

- `main` - 生产就绪代码
- 功能分支：`YYMMDD-(feat|fix|chore|refactor)-简短描述`

### 提交规范

- 中文消息，无 emoji，无 delete 类破坏性操作
- 格式：`type: 简短描述`
- 示例：`feat: 跟进记录一键共享为进度并优化共享文案`

### 数据库迁移

迁移文件位于 `server/migrations/`，按文件名前缀数字顺序执行，幂等设计。

新增迁移：
1. 创建 `server/migrations/NNN_描述.js`
2. 在 `server/index.js` 的 `start()` 函数中添加迁移调用
3. 本地验证：重启服务，观察迁移是否执行

## 常见任务

### 新增用户端 API 接口

**需修改的文件**：
1. `server/routes/[domain].routes.js` - 添加路由处理器
2. `miniapp/src/api/index.js` - 添加前端 API 方法

**步骤**：
1. 在路由文件中定义路由，使用 `authRequired` 或 `optionalAuth` 中间件
2. 使用 `query`/`queryOne`/`insert`/`update` 操作数据库
3. 前端在 `api/index.js` 添加对应方法
4. 在页面中调用并处理响应

### 新增前端页面

**需修改的文件**：
1. `miniapp/src/pages/[module]/[page].vue` - 新建页面
2. `miniapp/src/pages.json` - 注册路由

**步骤**：
1. 创建页面 .vue 文件（template + script setup + scoped style）
2. 在 `pages.json` 的 `pages` 数组中添加路由配置
3. 如需 tabBar 页面，同时在 `tabBar` 配置中添加项

### 修改管理后台功能

**需修改的文件**：
1. `miniapp/src/pages/admin/[module].vue` - 前端页面
2. `server/routes/admin/[module].routes.js` - 后端路由
3. `miniapp/src/admin/adminApi.js` - 管理 API 方法

**步骤**：
1. 后端路由挂载 `adminAuthRequired` + `requireRole(...)` 中间件
2. 前端页面调用 `adminApi` 方法
3. 角色权限在 `requireRole` 中配置

### 调整积分/等级规则

**需修改的文件**：
1. `server/seeds/seed.js` - 等级/积分种子数据
2. `server/services/level.service.js` - 等级计算逻辑
3. `server/services/payment/config-loader.js` - 支付配置

**步骤**：
1. 修改种子数据或直接更新 `member_levels` / `system_configs` 表
2. 如需改计算逻辑，修改 `level.service.js`
3. 后台管理页面可实时调整部分配置

## 编码规范

### 后端

- 路由文件：`[domain].routes.js`，模块内聚合
- 服务文件：`[domain].service.js`，复杂业务逻辑下沉
- 错误处理：try/catch + `console.error` + 统一 JSON 错误响应
- 认证：`authRequired`（用户）/ `adminAuthRequired`（管理）
- 权限：`requireRole('super_admin')` 等

### 前端

- 页面：`pages/[module]/[name].vue`，Composition API + `<script setup>`
- 组件：`components/[Name].vue`，Props 定义 + emit 事件
- API：统一通过 `api/index.js` 或 `admin/adminApi.js`，禁止页面内直接请求
- 样式：SCSS scoped，与组件同文件
- 常量：集中在 `common/constants.js`

### 数据库

- 迁移文件：`migrations/NNN_描述.js`，幂等执行
- 种子数据：`seeds/seed.js`，INSERT IGNORE 幂等
- 禁止在代码中硬编码 SQL 字符串作为配置，使用参数化查询防注入

## 安全注意事项

- 绝不提交 `.env` 文件或真实密钥
- 所有用户输入必须参数化查询（db.js 已封装）
- JWT 密钥生产环境必须显式设置，禁止使用默认值
- 上传文件通过 `file-magic.js` 校验魔数，防止伪造文件
- 密码使用 bcrypt 哈希存储
- 账号登录失败 5 次锁定 15 分钟
