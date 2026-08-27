# 小程序上线参数清单（后期填入）

当前代码已全部完成，以下参数留占位。按本清单逐项填入并重新构建即可上线，无需改业务代码。

## 1. 微信小程序凭据（必填）

| 参数 | 填入位置 | 获取方式 |
|------|---------|---------|
| 小程序 AppID | `miniapp/src/manifest.json` → `mp-weixin.appid`（当前为空字符串） | 微信公众平台 mp.weixin.qq.com「设置-基本信息的 AppID」 |
| 服务端 AppID | 环境变量 `WX_MINIAPP_APPID` | 同上，与前端一致 |
| 服务端 Secret | 环境变量 `WX_MINIAPP_SECRET` | 微信公众平台「开发管理-开发设置的 AppSecret」 |

未配置时服务端自动降级：微信登录/手机号授权接口返回 40401 提示，手机号+密码登录不受影响。

## 2. API 域名（必填）

1. `miniapp/src/common/config.js` → `PROD_API_BASE` 替换为正式 HTTPS 域名（当前占位 `https://api.example.com/api`）。
2. 微信公众平台「开发管理-服务器域名」配置：
   - request 合法域名：`https://<你的API域名>`
   - uploadFile/downloadFile 合法域名：同上
   - 域名须 ICP 备案且为 HTTPS。

## 3. 支付商户号（启用真实支付时必填）

| 环境变量 | 说明 |
|---------|------|
| `PAY_WECHAT_APPID` / `PAY_WECHAT_MCHID` / `PAY_WECHAT_SERIALNO` / `PAY_WECHAT_APIV` | 微信支付商户号三件套 + API 版本 |
| `PAY_WECHAT_PRIVATE_KEY_PATH` | 商户 API 私钥文件路径 |
| `PAY_WECHAT_NOTIFY_URL` | 回调地址：`https://<域名>/api/points/recharge/notify/wechat` |

测试环境支付走 mock 渠道（`PAY_DEFAULT_CHANNEL=mock`）；生产建议 `wechat`，H5 收银台渠道可用 `waffo` 系列（已配齐）。小程序端自动过滤 redirect 渠道，仅展示 mock/微信支付。

## 4. 构建与发布

```bash
cd miniapp && npm run build:mp
```

1. 微信开发者工具导入 `miniapp/dist/build/mp-weixin`
2. 详情-本地设置勾选「不校验合法域名」（仅联调用）
3. 上传体验版 → 配置体验成员 → 提交审核

## 5. 已验证的能力边界

- 微信登录链路：code → openid → 绑定/登录、getPhoneNumber 换手机号 —— 服务端已实现，凭据配置后即通
- 充值闭环（mock）：下单 → 模拟支付 → 余额到账 —— 冒烟通过
- 邀请奖励、注册赠送积分 —— 重构后回归通过
- 分享卡片携带 inviteCode/商机 ID —— 登录页已消费邀请码
