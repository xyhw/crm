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