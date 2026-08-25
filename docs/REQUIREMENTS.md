# 开发需求文档

> 版本：v1.1 · 更新日期：2026-08-25
> 完整需求背景见 `.monkeycode/specs/hotel-order-follow-platform/requirements.md`（内部文档）

## 1. 项目概述

酒店供应链在线跟单系统（CRM）：面向酒店筹建到开业全链路的供应商互助平台，覆盖装修总包、弱电总包、软装总包、酒店家具、运营物资等领域。核心闭环为「发布/认领跟单 → 跟进管理 → 积分激励 → 积分充值消费」。

## 2. 技术架构

| 层 | 技术 |
|----|------|
| 用户端 | React 18 + Vite + React Vant 3（H5 移动端）+ React Router |
| 管理后台 | 同一前端工程内的 admin 页面（Ant Design 风格自研组件） |
| 服务端 | Node.js + Express RESTful API |
| 数据库 | MySQL 8.0（migration 管理，启动自动执行） |
| 支付 | Waffo 支付网关（test/prod 双环境）+ mock 渠道（开发用） |
| 部署 | Docker Compose：mysql + api(node:20-alpine) + web(nginx 反代) |

## 3. 功能需求

### 3.1 认证与账户
- 手机号 + 密码注册登录，**邮箱注册时必填**（用于支付买家信息）
- JWT access token + refresh token 双令牌机制
- 登录接口限流防爆破（可通过环境变量调节）
- 个人中心：资料编辑、积分明细、余额查询

### 3.2 客户与订单管理
- 客户档案增删改查
- 酒店/订单信息关联管理
- 商机卡片展示与重设计

### 3.3 跟进记录
- 跟进记录新增/编辑/列表
- **状态白名单校验**：`call_no_answer / added_wechat / interested / quoting / negotiating / closed / abandoned`，非法值返回 400（防止枚举截断脏数据）
- 公告/简报模块

### 3.4 积分与支付（本期重点）
- **积分充值**：H5 充值弹窗，金额输入 → 创建支付订单 → 拉起收银台
  - 充值弹窗仅传 `{ amount }`；支付渠道由管理后台 `pay_default_channel` 统一决定，用户端无感知
  - 买家邮箱后端自动从 `users.email` 取，透传给 Waffo `buyerEmail`
- **Waffo 支付集成**
  - checkout.authenticated.create 下单，预填买家信息免填表单
  - 收银台语言固定 `zh-Hans`
  - 仅支持 `successUrl` 参数（无失败/取消跳转，失败感知靠前端轮询）
  - webhook 回调 `order.completed`，`express.raw()` 原始 body 验签
  - 商品首次创建后 productId 持久化到 `system_configs.pay_waffo_product_id`，重启不重复建品
- **支付结果页**（`/points/result`）：成功 / 失败 / 处理中超时三态，轮询 90 次 × 2s，失败引导重新充值
- **订单过期标记**：超时未支付的充值订单自动标记 expired
- **mock 渠道**：开发/测试环境模拟支付成功

### 3.5 管理后台
- RBAC 权限模型（超级管理员 / 运营 / 财务 / 客服）
- 系统配置（system_configs 键值存储）：
  - 支付开关、默认渠道（mock / waffo 下拉）
  - Waffo 凭据：Merchant ID、Store ID、私钥、货币、环境（test/prod）
  - Waffo successUrl 显式覆盖项（清空则基于站点域名拼接 `/points`）
  - **站点域名**（pay_site_base_url）：作为支付回调与跳转的基准地址
- 用户管理、订单管理、财务流水

### 3.6 非功能需求
- 生产模式强制校验 JWT_SECRET / REFRESH_SECRET / ADMIN_SECRET，缺失拒绝启动
- `.env` 类文件全部 gitignore，密钥不入仓
- 上传文件独立 volume 持久化
- 数据库 migration 幂等可重复执行

## 4. 验收标准

- 后端测试 45/45 通过（`node --test test/*.test.js`）
- 前端测试 109/109 通过（vitest）
- `docker compose up -d --build` 一键拉起完整可用系统（含自动建表 + 种子数据）
- 支付链路：充值下单 → 收银台 → webhook 回调入账 → 结果页展示正确状态
