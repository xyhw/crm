# 小程序部署文档

「商机互助」微信小程序端（uni-app + Vue3 + Pinia）的本地联调与上线发布流程。上线前需填入的参数清单见 `miniapp/DEPLOY-CHECKLIST.md`，本篇描述完整操作步骤。

## 目录结构

```
miniapp/
├── src/
│   ├── pages/          # 25 个页面（index/hall/publish/crm/profile 等 9 组）
│   ├── api/index.js    # 接口层，与 H5 端 client 的方法签名一致
│   ├── common/         # request 封装 / config / payment 渠道降级
│   ├── store/user.js   # 登录态（token 缓存、微信登录、绑定）
│   └── components/
├── vite.config.js      # H5 反代配置（/api、/uploads -> 后端 :3001）
└── dist/build/mp-weixin/   # 构建产物（微信开发者工具导入此目录）
```

## 环境要求

- Node.js 20+（沙箱内验证版本 v22）
- 微信开发者工具（稳定版），拥有小程序测试号或正式 AppID
- 可访问的后端服务：本机 `http://127.0.0.1:3001` 或已部署的正式环境

## 一、本地开发

### 1. 启动后端

```bash
cd server && RATE_LIMIT_LOGIN_MAX=999999 node --env-file-if-exists=.env index.js
```

后端监听 `:3001`，启动时自动执行全部 migrations（含 migration 014 微信绑定字段）。

### 2. 启动 H5 联调服务（推荐）

```bash
cd miniapp && npx uni --port 5174 --host 0.0.0.0
```

- 浏览器访问 `http://localhost:5174`
- 页面交互、接口联调全链路可用；vite 已反代 `/api` 与 `/uploads` 到后端，无跨域问题
- 平台差异：H5 下无法测试微信原生能力（支付拉起、原生分享面板、手机号授权弹窗）

### 3. 微信开发者工具模拟器调试

```bash
# 生成 mp-weixin 产物
cd miniapp && npm run build:mp

# 或开发模式 watch 构建
cd miniapp && npm run dev:mp
```

导入步骤：

1. 打开微信开发者工具 → 导入项目
2. 目录选择 `miniapp/dist/build/mp-weixin`
3. AppID 使用测试号（详情-本地设置勾选「不校验合法域名」以便请求本机后端）

## 二、接口地址配置

`miniapp/src/common/config.js` 决定 API 基址，按编译目标自动区分：

| 编译目标 | 取值 | 说明 |
|---------|------|------|
| H5 | `/api` 同源相对路径 | 由 vite proxy 转发到后端 |
| 小程序开发 | `http://127.0.0.1:3001/api` | 本机联调 |
| 小程序生产 | `PROD_API_BASE` 常量 | 上线前替换为正式 HTTPS 域名 |

附件 URL 统一通过 `UPLOAD_BASE`（API 基址去掉 `/api` 后缀）拼接。

## 三、服务端配套配置

微信登录相关凭据通过环境变量注入（未配置时自动降级为提示，不影响手机号登录）：

```env
WX_MINIAPP_APPID=wx1234567890abcdef
WX_MINIAPP_SECRET=your-app-secret-here
```

生效的接口能力：

| 接口 | 功能 |
|------|------|
| `POST /api/auth/wechat-login` | code 换 openid，已绑定直接登录，未绑定返回待绑定标识 |
| `POST /api/auth/bind-wechat` | 手机号已注册则绑定老账号，否则建新号（含注册赠送与邀请奖励） |
| `POST /api/auth/phone` | getPhoneNumber 动态 code 换真实手机号 |

支付渠道行为：小程序端只展示 mock 与微信支付两个渠道（redirect 型收银台如 waffo 在小程序内无法拉起，已在 `common/payment.js` 过滤）。真实微信支付需配置商户号系列环境变量，见 DEPLOY-CHECKLIST.md 第 3 节。

## 四、微信公众平台设置

1. **AppID**：填入 `miniapp/src/manifest.json` 的 `mp-weixin.appid`
2. **服务器域名**（「开发管理-开发设置-服务器域名」）：
   - request 合法域名：`https://<api域名>`
   - uploadFile/downloadFile 合法域名：同上
3. **隐私协议**：「设置-基本设置-服务内容声明」补充用户隐私保护指引（涉及头像昵称收集需声明）

## 五、发布上线

1. 替换 `config.js` 的 `PROD_API_BASE` 为正式域名
2. 构建产物：

```bash
cd miniapp && npm run build:mp
```

3. 开发者工具上传代码（产物目录下），填写版本号与备注
4. 公众平台设为体验版，邀请业务方验收
5. 提交审核 → 审核通过后发布正式版

## 六、常见问题

**接口报「不在以下 request 合法域名列表中」**
正式版请求了未备案或未配置的域名。检查第四节服务器域名配置；开发者工具阶段勾选「不校验合法域名」即可绕过。

**点充值提示「渠道不可用」或无渠道可选**
后端可用渠道仅含 redirect 型渠道（waffo）。设置 `PAY_DEFAULT_CHANNEL=mock` 保证测试环境可完成支付闭环。

**微信登录返回 40401**
服务端未配置 `WX_MINIAPP_APPID/WX_MINIAPP_SECRET`。配置并重启后端即可。

**分享进入后邀请码不生效**
确认分享卡片的 path 携带 `?inviteCode=` 参数；登录页 onLoad 会将 inviteCode 写入本地存储 `hof_pending_invite`，在绑定或注册成功后消费。

**H5 预览页面白屏且控制台 404**
`npx uni` 默认端口被占用时会换端口启动，以终端输出的实际端口为准访问。
