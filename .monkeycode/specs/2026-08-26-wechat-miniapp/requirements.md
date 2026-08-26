# Requirements Document

## Introduction

将现有「跟单互助 · 酒店供应链在线跟单系统」的用户端（当前为 React H5）改造成**微信小程序**。管理后台保留 Web 形态不动，后端 Express + MySQL API 大部分可复用，核心新增微信登录、微信支付与手机号绑定能力。

技术选型（用户已确认）：
- 前端：**uni-app + Vue 3**（新建独立工程，全部用户端功能迁移）
- 范围：**全部用户端功能**（登录绑定、大厅、发布、CRM、订单、积分充值支付、会员、信用、排行榜、通知提醒、协议、公告等）

## Glossary

- **System**: 微信小程序用户端，名称沿用「商机互助」，与后端 `/api` 接口交互
- **用户端功能**: 面向供应商的用户侧能力集合（下述需求范围）
- **管理后台**: 现有 React + antd 后台，本次不改动
- **openid**: 微信用户在小程序内的唯一标识
- **unionid**: 微信开放平台下跨应用统一标识（可选）
- **微信手机号**: 通过 `<button open-type="getPhoneNumber">` 授权获取的手机号
- **微信支付**: 小程序内 `wx.requestPayment` 拉起支付（JSAPI）
- **积分购买**: 用户使用账户积分解锁商机联系方式的交易行为
- **商机**: 平台发布的跟单/供应线索（opportunity）
- **CRM 客户**: 用户维护的客户档案及其跟进记录
- **微信订阅消息**: 微信消息订阅模板，用于提醒/通知推送

## Requirements

### R1 微信登录与手机号绑定

**User Story:** AS 新老供应商用户，I want 用微信一键登录或绑定手机号，so that 无需记忆密码即可进入小程序使用全部功能。

#### Acceptance Criteria

1. WHEN 用户在小程序内首次打开，系统 SHALL 调用 `wx.login` 获取 code 并传给后端 `POST /api/auth/wechat-login`
2. WHEN 后端根据 code 换取 openid 成功，IF openid 已关联有效用户，系统 SHALL 签发与 Web 端一致的 JWT access/refresh token 并完成登录
3. WHEN openid 未关联用户，系统 SHALL 返回 `need_bind` 状态并跳转至手机号绑定页
4. WHEN 用户点击「微信一键登录」按钮，系统 SHALL 通过 `getPhoneNumber` 授权获取手机号 code，并调用后端解密换取真实手机号
5. WHEN 绑定流程提交，IF 手机号已存在于 users 表（老账号），系统 SHALL 将 openid 绑定到该账号并返回登录态；IF 手机号未注册（新用户），系统 SHALL 创建新账号（含积分账户、等级统计、注册赠送积分）并绑定 openid
6. WHEN 绑定完成，系统 SHALL 保存 JWT 令牌至本地存储并在后续请求的 Authorization 头携带
7. IF JWT 过期且存在 refreshToken，系统 SHALL 自动调用 `POST /api/auth/refresh` 续期并重试原请求
8. IF 刷新失败，系统 SHALL 清除本地登录态并返回登录/绑定页

### R2 账号安全一致性

**User Story:** AS 小程序用户，I want 与 Web 端共享同一账号体系与安全策略，so that 两端数据一致且账号不被暴力攻击。

#### Acceptance Criteria

1. WHEN 用户使用手机号+密码登录小程序，系统 SHALL 复用现有 `POST /api/auth/login`（含登录限流、账号锁定阈值），不新增绕过入口
2. WHEN 用户重置/修改密码，系统 SHALL 复用现有 `change-password` / `forgot-password` 流程与密码策略（≥8 位含字母数字）
3. WHEN 用户在任意端修改密码，系统 SHALL 使两端所有已签发 token_version 失效
4. IF openid 关联的账号为 banned 状态，系统 SHALL 拒绝登录并提示「账号已被禁用」

### R3 互助大厅（商机浏览/筛选/搜索/详情）

**User Story:** AS 用户，I want 在小程序内浏览商机大厅、筛选分类、搜索关键词、查看详情并用积分解锁联系方式，so that 获取供应线索。

#### Acceptance Criteria

1. WHEN 用户进入大厅页面，系统 SHALL 复用 `GET /api/opportunities` 分页展示商机卡片（含公开字段、标签、积分价格）
2. WHEN 用户切换分类/标签或输入关键词，系统 SHALL 复用现有查询参数（category/tag/keyword/排序）重新请求列表
3. WHEN 用户点击商机卡片，系统 SHALL 复用 `GET /api/opportunities/:id` 展示详情页
4. WHEN 用户点击「积分解锁」，系统 SHALL 复用 `POST /api/orders` 创建购买订单，余额充足则立即扣减并展示完整联系方式，余额不足则引导充值
5. WHILE 用户已购买某商机，系统 SHALL 在详情页展示已解锁状态与完整联系方式，重复购买不重复扣费
6. IF 商机已下架或不可见，系统 SHALL 在详情页给出提示并禁止购买

### R4 发布跟单（含相似度检测）

**User Story:** AS 用户，I want 在小程序内提交商机投稿，so that 发布后按审核流程上架大厅。

#### Acceptance Criteria

1. WHEN 用户在发布页填写商机表单并提交，系统 SHALL 复用 `POST /api/opportunities` 及现有字段校验
2. WHEN 用户提交前触发相似度校验，系统 SHALL 复用现有相似度服务，IF 命中疑似重复，系统 SHALL 展示提示并要求确认
3. WHEN 发布表单含图片，系统 SHALL 使用 `wx.chooseImage`/`wx.uploadFile` 上传至现有 `POST /api/upload`（multipart + 魔数校验），并回填返回 URL
4. WHEN 发布成功，系统 SHALL 跳转至商机详情或大厅并给出成功反馈

### R5 个人 CRM 与跟进

**User Story:** AS 用户，I want 在小程序内维护客户档案与跟进记录，so that 闭环管理销售线索。

#### Acceptance Criteria

1. WHEN 用户进入 CRM 列表，系统 SHALL 复用 `GET /api/crm` 分页展示客户档案
2. WHEN 用户新增客户，系统 SHALL 复用 `POST /api/crm`（含状态创建）
3. WHEN 用户查看客户详情，系统 SHALL 复用 `GET /api/crm/:id` 展示档案与 `GET /api/follow-ups/:crmId` 跟进历史
4. WHEN 用户新增跟进/推进状态，系统 SHALL 复用 `POST /api/follow-ups` 及现有状态机校验
5. WHEN 用户把 CRM 客户发布为商机，系统 SHALL 复用 `POST /api/crm/:id/publish`
6. WHEN 用户将跟进记录分享，系统 SHALL 复用 `POST /api/follow-ups/share` 生成分享内容，并通过原生 `onShareAppMessage` 转发

### R6 订单、积分与微信支付

**User Story:** AS 用户，I want 在小程序内查看订单、积分明细并进行微信支付充值，so that 完成积分交易闭环。

#### Acceptance Criteria

1. WHEN 用户查看我的订单，系统 SHALL 复用 `GET /api/orders/my` 分页展示购买/充值记录
2. WHEN 用户查看积分余额与流水，系统 SHALL 复用 `GET /api/points/balance` 与 `GET /api/points/logs`
3. WHEN 用户在充值页选择金额提交，系统 SHALL 复用 `POST /api/points/recharge` 创建充值单并选择 wechat 渠道
4. WHEN 后端完成 JSAPI 下单，系统 SHALL 返回调起参数并调用 `wx.requestPayment` 拉起微信支付收银台
5. WHEN 支付完成后，系统 SHALL 复用支付状态查询接口回查订单状态并展示结果页（成功/失败/超时）
6. WHEN 未配置真实微信支付商户（开发/测试环境），系统 SHALL 降级使用现有 mock 渠道，充值页面提供「模拟支付」入口，功能不阻断

### R7 社区与个人信息

**User Story:** AS 用户，I want 在小程序内使用排行榜、邀请、会员等级、信用分、通知、提醒、公告、协议等功能，so that 完整迁移 Web 端社区体验。

#### Acceptance Criteria

1. WHEN 用户进入各社区页面，系统 SHALL 复用对应接口：排行榜 `GET /api/rankings`、邀请 `GET /api/invitations/me`、会员等级、信用分 `GET /api/credits`、通知 `GET /api/notifications`、提醒 `GET /api/reminders`、公告 `GET /api/announcements`、协议 `GET /api/agreement/:type`
2. WHEN 用户点击通知，系统 SHALL 复用 `PUT /api/notifications/:id/read` 标记已读，支持 `PUT /api/notifications/read-all` 全部已读
3. WHEN 用户分享邀请/商机/排行榜，系统 SHALL 使用 `onShareAppMessage` 原生转发，分享携带入口参数（inviteCode/商机ID）
4. WHEN 用户编辑个人资料，系统 SHALL 复用 `PUT /api/auth/me`（昵称/头像/公司/分类/简介/资质/案例）
5. WHEN 用户上传头像，系统 SHALL 使用 `wx.chooseImage` + 现有上传接口

### R8 微信环境适配与合规

**User Story:** AS 产品与运维，I want 小程序满足微信平台技术规格与合规要求，so that 通过审核并稳定运行。

#### Acceptance Criteria

1. WHEN 小程序请求后端，系统 SHALL 使用 **HTTPS + 已备案域名**，调用域名在微信公众平台 request 合法域名白名单内
2. WHEN 小程序上传文件，系统 SHALL 在 uploadFile 合法域名白名单内，且后端复用魔数校验拒绝伪造文件
3. WHEN 用户首次使用授权能力，系统 SHALL 在隐私政策中声明手机号/位置/相册等数据用途，并复用现有 `GET /api/agreement/privacy`
4. WHEN 页面支持分享，系统 SHALL 具备 onShareAppMessage 配置，补全分享标题/图片/路径
5. WHEN 小程序需要推送提醒/通知，系统 SHALL 采用微信订阅消息模板（后端存 openid + 订阅结果），实现为用户后续迭代项，不阻塞本期上线

## 明确不包含（Out of Scope）

- 管理后台的小程序化：后台保持 React + antd Web 形态
- 存量 Web H5 的下线或停更（双端并存期间继续可维护）
- 微信订阅消息服务端发送实现（本期仅预留 openid 与模板字段，见 R8-5）
- 位置/地图能力、蓝牙、NFC 等其他小程序能力
- uni-app 多端发布（H5/App 等非微信目标端不在本期范围）