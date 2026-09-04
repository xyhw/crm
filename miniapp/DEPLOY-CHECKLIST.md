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

## 3. 微信虚拟支付（个人主体，启用真实收款时必填）

开通条件：个人主体 + 中国大陆居民身份证 + 服务类目含「工具」+ 已完成认证、备案。月支付限额 10 万元。

| 环境变量 / 后台配置 | 说明 |
|---------|------|
| `PAY_WECHAT_APPID` | 小程序 AppID（可与 `WX_MINIAPP_APPID` 相同） |
| `PAY_WECHAT_OFFER_ID` | MP 后台「虚拟支付 → 基本配置」OfferID |
| `PAY_WECHAT_APPKEY` | 现网 AppKey（支付签名密钥，勿提交仓库） |
| `PAY_WECHAT_PRODUCT_MAP` | JSON，积分数→已发布道具 ID，如 `{"50":"prod_50","100":"prod_100"}`。道具价格（分）须等于 积分 × `PAY_POINTS_TO_YUAN` × 100 |
| `PAY_WECHAT_ENV` | `0` 现网 / `1` 沙箱 |
| `PAY_WECHAT_PUSH_TOKEN` | 消息推送 Token，用于发货推送 URL 验证 |
| `PAY_WECHAT_NOTIFY_URL` | `https://<域名>/api/points/recharge/notify/wechat`，填到 MP 后台发货推送配置 |

费率与结算：Android 等 1%、T+3；iOS 12%、约 45-60 天（用户向 App Store 申请退款）。iOS 需配置小程序简称，微信客户端 ≥ 8.0.68。

测试环境走 mock（`PAY_DEFAULT_CHANNEL=mock`）；生产开启 `pay_wechat_enabled` 并将默认渠道设为 `wechat`。

上线后对账入口：后台「充值对账」（`/pages/admin/recharge-orders`，财务/超管角色）。可按状态、渠道、单号筛选，查看当日成交与「已支付订单积分 vs 已入账积分」差额；发货推送丢失且超出定时兜底窗口（2 天）的 pending 单，可在该页手动「查单补账」，补账幂等且写操作日志。

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
- 虚拟支付：签名/发货推送解析/幂等入账 —— 单测覆盖；真单需 MP 后台开通后验证
- 充值对账后台：列表筛选、汇总差额、pending 单查单补账 —— 接口与 mock 渠道实测通过
- 邀请奖励、注册赠送积分 —— 重构后回归通过
- 分享卡片携带 inviteCode/商机 ID —— 登录页已消费邀请码
