# 项目知识记录

## react-vant 3.3.5 组件 API 注意事项
- 日期: 2026-08-06
- 上下文: 排查 H5 用户端页面空白崩溃时发现
- 类别: 开发规范
- 说明:
  - react-vant 3.3.5 的 `NavBar.leftArrow` 在传入布尔值 `true` 时，组件内部会调用 `React.cloneElement(true)` 导致渲染崩溃（`Element type is invalid: got: undefined`）。类型定义虽支持 `boolean | ReactNode`，但实际实现未处理布尔值分支。必须传 React 元素（如 `<ArrowLeft width={20} height={20} />`）。
  - react-vant 的 `GridItem.icon`、`Cell.icon`、`Button.icon` 等 `icon` prop 内部使用 `React.cloneElement` 处理。传入字符串会导致崩溃，必须传 React 元素。
  - react-vant 的正确组件是 `Tabs.TabPane`（不是 `Tabs.Tab`）。
  - react-vant 的 `Empty` 组件在 ESM 环境中导出有效，是可用的 forwardRef 组件。
  - 所有带 `icon` prop 或 `leftArrow` prop 的页面统一使用 `@react-vant/icons` 元素（不要用字符串）。

## 后端运维与调试
- 日期: 2026-08-22
- 上下文: 排查共享进度榜改造后前后端不一致时发现（2026-08-22 主动记录）
- 类别: 运维与部署 / 环境配置
- 说明:
  - 后端 Node 服务无热重载：修改 `server/routes/*.js` 等后端代码后必须重启进程才生效，重启前用 `ss -ltnp | grep :3001` 定位旧 PID 并 kill，再用后台终端以 `cd /workspace/server && RATE_LIMIT_LOGIN_MAX=999999 node --env-file-if-exists=.env index.js` 启动新实例。
  - 数据库可用 `mysql -uhof_user -phof_pass_2026 hotel_order_follow` 直接查询调试（表结构见 server/db/init.sql）。
  - 构建/部署与后端调试登录时，登录接口 `POST /api/auth/login` 有速率限制，调试脚本高频调用会返回空 token；需在服务端带上 `RATE_LIMIT_LOGIN_MAX=999999` 环境变量。

## 小程序支付渠道降级
- 日期: 2026-08-26
- 上下文: 完成小程序积分充值流程冒烟测试时发现（2026-08-26 主动记录）
- 类别: 环境配置 / 排查调试
- 说明:
  - 当前环境支付默认渠道为 `waffo`（PAY_DEFAULT_CHANNEL=waffo），其支付方式是 redirect 托管收银台，只能浏览器跳转；微信小程序内无法拉起该渠道，必须过滤掉。
  - 小程序端点充值一律走 `miniapp/src/common/payment.js` 的 `resolveMiniappChannels()`：只保留 `mock` / `wechat`(jsapi) 渠道，wechat 未配置时兜底 mock，避免创建 waffo 订单后在小程序内无意义。
  - mock 渠道链路验证（2026-08-30 更新）：`mock` 渠道在生产环境已禁用（`_channelEnabled.mock = NODE_ENV!=='production'`），且 `POST /api/points/recharge/mock-pay/:orderNo` 与 `createRechargeOrder` 均加了生产守卫。开发环境验证：注册送 10 积分 → 建 mock 订单 → mock-pay → 余额到账。
  - 小程序充值/购买接口冒烟用 `curl` + 注册临时账号（手机号 `139` + 时间戳）即可；**注册密码必须 ≥8 位且同时含字母和数字**（如 `pass1234`）。

## 商机发布价格约束
- 日期: 2026-08-30
- 上下文: 资金安全修复落地时确认（主动记录）
- 类别: 环境配置 / 业务约束
- 说明:
  - 商机发布/编辑/CRM投稿统一校验 `price` 为正整数，下限 10、上限由 `system_configs` 的 `opportunity_price_min/max` 配置（seed 默认 10~200）。
  - 手动录入 CRM 的商机为 `inactive` 状态（不可公开购买），经 `POST /api/crm/:id/publish` 定价后置 `active` 公开。

## 充值退款约定
- 日期: 2026-09-04
- 上下文: 用户明确退款口径（用户指令）
- 类别: 业务约束 / 运维与部署
- 说明:
  - `pay_wechat_env` 缺省为沙箱（`1`）。现网必须在后台显式改为 `0`，不要把代码/环境变量默认改回现网。
  - 充值退款只支持整笔订单退款，不做部分退款；不要给 `refundRechargeOrder` 加按金额比例扣分的逻辑。
  - 系统**不调用**任何渠道（微信虚拟支付 / Waffo）的退款接口。实际退款由运营在渠道后台人工完成，后台 `POST /api/v1/admin/recharge-orders/:orderNo/refund` 只做记账与留痕：订单转 `refunded`、扣回积分、写 `refund` 流水、记 `recharge_refund` 审计日志。
  - 退款扣分允许把余额扣成负值（积分债务），用于闭合"充值→消费→退款"套利；负余额由下单处的余额校验拦截，不要为了"余额不能为负"改成扣到 0 为止。

## 后台写接口请求体命名约定
- 日期: 2026-09-05
- 上下文: 修复 PC 后台 Banner 创建 400、分类/标签 sort_order 静默丢失时确认（主动记录）
- 类别: 排查调试 / 开发规范
- 说明:
  - 后台写接口（`server/routes/admin/*`）统一用 `server/utils/body-fields.js` 的 `pickBodyFields(req.body, [...])` 读请求体，camelCase 优先、自动回退等价 snake_case。新增写接口沿用这个入口，不要直接 `const { x } = req.body`，否则前端按数据库列名发字段时会静默丢参。
  - `pickBodyFields` 只收录命中的键，PUT 接口"缺省字段不更新"的语义不受影响；`0` / `null` / `false` / `''` 均按有效值传递。
  - 排查这类问题的信号：POST 报"必填项为空"但前端明显填了，或 PUT 返回成功而某字段没变。先比对前端实际发的键名与后端解构的键名。
  - 后端路由改动后需重启进程验证：`background_terminal_kill` 旧终端 → 重新起 `cd /workspace/server && RATE_LIMIT_LOGIN_MAX=999999 node --env-file-if-exists=.env index.js`，`ss -ltnp | grep :3001` 确认监听。
  - 后端全量 `npm test` 单次跑会超 5 分钟，按文件分批跑：纯逻辑组（body-fields/core/p1/security/vpay-*/payment）与数据库组（admin-recharge/admin-auth/announcement/follow-up）分开。
  - 本地 dev 服务器需同时带 `RATE_LIMIT_LOGIN_MAX=999999 RATE_LIMIT_CHANGE_PWD_MAX=999` 启动，否则集成测试（admin-auth.test.js / security.test.js 多次 login/改密）会同 IP 触发限流 429。生产默认改密 10 次/15 分钟。

## 独立 PC 管理后台（admin-pc）
- 日期: 2026-09-05
- 上下文: 搭建独立 PC 后台时记录（主动记录）
- 类别: 构建与测试 / 环境配置
- 说明:
  - `admin-pc` 是纯 Vue 3 + Vite 的独立 PC 后台，端口 5175，`npm run dev` / `npm run build`，依赖只有 vue / vue-router / pinia。
  - `/api` 与 `/uploads` 均反代到 `http://127.0.0.1:3001`；`allowedHosts` 已含 `.monkeycode-ai.online`、`.monkeycode-ai.com`。
  - 与 miniapp H5（5174）的后台页并存，两端共用同一套 `/api/v1/admin` 接口。

## 前端同源整合（方案A）
- 日期: 2026-08-30
- 上下文: 用户确认方案A：以 miniapp（uni-app）为唯一前端，废弃 client（React）双版本（主动记录）
- 类别: 环境配置 / 构建与测试
- 说明:
  - `miniapp` 一份代码同时编译 H5 与微信小程序，条件编译 `#ifdef MP-WEIXIN` / `#ifndef MP-WEIXIN` 区分平台（payment.js 渠道过滤、onBannerTap 链接处理）。
  - `client`（React，端口 5173）将下线，主预览切到 miniapp H5（端口 5174）。
  - miniapp 测试：`cd /workspace/miniapp && NODE_PATH=$(npm root -g) npx vitest run`。测试依赖（vitest/jsdom/@vue/test-utils）全局安装在 `/usr/local/lib/node_modules`，在 `miniapp/node_modules` 下用符号链接指向全局；`@vue/test-utils` 必须在项目本地安装以避免与项目 vue 3.5.41 双实例冲突（全局自带 vue 3.5.42 会报 `reading 'ce'`）。
  - 投稿人姓名匿名：后端 `server/constants.js` 的 `anonymizeName()` 确定性哈希取单字，前台 API 返回匿名昵称；后台 admin 接口保留实名。前端直接展示后端值，不要再套 maskName 二次脱敏。
  - miniapp 分页约定：列表接口用服务端分页（page/pageSize + total），后端 rankings 接口已补 total 字段；不要一次性 pageSize:50 拉全量。