# Miniapp 全页 UI/UX 修复计划

> 日期：2026-09-06
> 分支：`260906-feat-ci-pipeline`
> 范围：`miniapp/src/pages.json` 共 52 页（用户端 29 + 管理端 23）
> 依据：ui-ux-pro-max 清单（a11y / 触控 / 表单 / 导航）
> 状态：T-02～T-08 已完成（T-01 待办），P2/P3 待排期

对照优先级：P0 先修 → P1 高 → P2 中 → P3 低。验收以 H5（5174）与微信小程序编译为准。

---

## P0 — 先修

### T-01 底栏补图标

- 问题：`pages.json` tabBar 与 `CustomTabBar.vue` 只有文字，无 `iconPath`。微信规范要求图标+文字。
- 文件：`miniapp/src/pages.json`、`miniapp/src/components/CustomTabBar.vue`、新增 `miniapp/src/static/tabbar/`
- 动作：
  - 为首页/大厅/发布/CRM/我的各做一套未选中+选中 SVG/PNG（绿 `#048C47` / 灰 `#7A7A7A`）
  - `pages.json` 补 `iconPath`、`selectedIconPath`
  - `CustomTabBar` 同步图标+文字
- 验收：H5 与小程序底栏可见图标；当前 Tab 高亮。

### T-02 仪表盘数字绑定

- 问题：`admin/dashboard.vue` 的 `statCards` 是常量，从未把 `stats.value` 写入 `card.value`，四张卡片始终空白。
- 文件：`miniapp/src/pages/admin/dashboard.vue`
- 动作：用 computed 把 `totalUsers / totalOpportunities / totalOrders / totalPoints` 映射到卡片；加载失败保留 toast + 空态。
- 验收：登录管理端后仪表盘显示真实数字。

### T-03 H5 邀请海报降级

- 问题：「邀请海报」tab 按钮在所有平台渲染（`invite.vue:8`），但海报卡片（36–48 行）与绘制逻辑（119–217 行）整段包在 `#ifdef MP-WEIXIN` 内。H5 切过去是完全空白的 tab，连「不支持」提示都没有——提示文案本身也在条件编译块里。
- 文件：`miniapp/src/pages/community/invite.vue`
- 动作：在 `#ifndef MP-WEIXIN` 分支补降级卡片，说明海报仅小程序可用，并保留复制邀请码入口。
- 验收：H5 切到「邀请海报」有明确说明与可用操作，不再空白。

### T-04 去掉管理端默认账密文案

- 问题：`admin/login.vue:27` 写着 `默认账号：admin / admin123`；两个输入框只有 placeholder，无可见 label。
- 文件：`miniapp/src/pages/admin/login.vue`
- 动作：删除该提示行；补「用户名」「密码」可见 label。
- 注：该页已有 `passwordVisible` 显隐（17、21 行），无需改动。
- 验收：页面不再出现默认账密；输入框有可见标签。

### T-05 移除「我发布的」错误底栏

- 问题：`opportunity/mine.vue` 不是 Tab 页，却挂了 `CustomTabBar`，且 `active-tab="我的"`，与系统 tabBar 冲突。
- 文件：`miniapp/src/pages/opportunity/mine.vue`
- 动作：去掉 `CustomTabBar`；保留系统返回栈；检查底部 padding 是否仍为双栏预留。
- 验收：该页只有系统导航返回，无第二套底栏。

---

## P1 — 高

### T-06 用户端密码显隐

- 问题：用户端三页仍是 `:password="true"`（`login/index.vue:41`、`register.vue:42`、`forgot.vue:44`），无法查看已输入内容。
- 文件：`miniapp/src/pages/login/index.vue`、`login/register.vue`、`login/forgot.vue`
- 动作：改 `:type="visible ? 'text' : 'password'"` + 独立「显示/隐藏」，触控区 ≥44pt。
- 注：`profile/change-password.vue` 与 `admin/login.vue` 已有开关，本条只改用户端这三页。
- 验收：三页均可单独切换明文。

### T-07 协议改为显式勾选

- 问题：登录/注册「即代表您已阅读并同意」，无勾选；字号 22rpx、颜色 `#B0B0B0`。
- 文件：`login/index.vue`、`login/register.vue`
- 动作：增加勾选框，未勾选禁止提交并 toast；协议文字对比度达标（至少 `#555` / 24rpx+）。
- 验收：未勾选无法登录/注册；可点开协议与隐私。

### T-08 找回密码提交防连点

- 问题：`login/forgot.vue:51` 提交按钮只有 `:loading="submitting"`，缺 `:disabled`，可重复点击。
- 文件：`miniapp/src/pages/login/forgot.vue`
- 动作：补 `:disabled="submitting"`。
- 注：`login/index.vue:14,50`、`register.vue:50`、`login/bind.vue:11` 已有 `:disabled`，原清单误列，本条范围收窄到 forgot 一页。`publish.vue`、`crm/add.vue` 另行核对后再定。
- 验收：连点不会重复提交。

### T-09 触控区达标

- 问题：发布页附件删除 `40×40rpx`；通知/提醒未读点 `40rpx`；分类 chip 内边距 `12rpx`。
- 文件：`opportunity/publish.vue`、`community/notify.vue`、`community/reminder.vue`、`hall/hall.vue`
- 动作：可点区域扩到 ≥44pt（视觉可小于 hit area）；chip 垂直 padding ≥16rpx。
- 验收：真机/模拟器不易误点。

### T-10 去掉结构性 emoji / 单字图标

- 问题：详情锁内容用 `🔒`；管理首页入口用单字「板/商/导」。
- 文件：`opportunity/detail.vue`、`admin/index.vue`
- 动作：锁改 SVG/unicode 几何图标或纯文字「未解锁」；管理宫格改统一线性图标或双字标签，不用 emoji。
- 验收：页面无结构性 emoji。

### T-11 空态补动作

- 问题：大厅 / CRM / 订单只有文案；订单写「去大厅看看」但点不了。
- 文件：`hall/hall.vue`、`crm/index.vue`、`order/list.vue`、`opportunity/detail.vue`（商机不存在）
- 动作：空态标题+说明+主按钮（去发布 / 去大厅 / 返回）；详情不存在提供返回。
- 验收：空列表可一键到达下一步。

---

## P2 — 中

### T-12 对比度与字号

- 问题：`#7A7A7A` / `#B0B0B0` / `#999` 用于正文和底栏未选中；首页提醒点 16rpx、公告徽章 20rpx、附件大小 18rpx。
- 文件：全局样式、`index/index.vue`、`opportunity/publish.vue`、tabBar `color`
- 动作：次要文字不低于 `#555555`（浅底）；正文 ≥28rpx，辅助 ≥24rpx；底栏未选中提高对比。
- 验收：正文对比 ≥4.5:1。

### T-13 列表加载骨架

- 问题：首页、大厅、详情、积分、管理列表只有「加载中...」。
- 文件：可抽 `Skeleton.vue`，先用于首页/大厅/详情。
- 动作：首屏用 2–3 条卡片骨架，避免布局跳动。
- 验收：弱网下先出骨架再出内容。

### T-14 输入键盘类型

- 问题：邮箱 `type="text"`；手机 `type="number"`。
- 文件：登录/注册/找回/绑定/发布/CRM 录入
- 动作：手机 `type="tel"` 或 `inputmode="tel"`；邮箱 `type="email"`。
- 验收：H5 弹出正确键盘。

### T-15 CRM FAB 无障碍

- 问题：FAB 只有「+」，无文字、无无障碍名。
- 文件：`crm/index.vue`
- 动作：加 `aria-label` / 旁注「新增客户」；保留 ≥44pt。
- 验收：读屏能读出用途。

### T-16 客服占位号

- 问题：`400-123-4567`、`support@hotel-order.com` 会真拨号。
- 文件：`common/support.vue`、系统配置若已有客服字段则改读配置
- 动作：有配置用配置；无配置展示「暂未开通」且不拨号。
- 验收：未配置时不会拨出占位号。

### T-17 大厅搜索清除

- 问题：CRM 有输入防抖，大厅只有确认搜索、无清除。
- 文件：`hall/hall.vue`
- 动作：有关键词时显示清除；可选防抖搜索。
- 验收：可一键清空并恢复列表。

### T-18 改密显隐拆开

- 问题：旧/新/确认密码共用一个显隐。
- 文件：`profile/change-password.vue`
- 动作：每字段独立开关。
- 验收：可只看新密码、旧密码保持隐藏。

---

## P3 — 低

### T-19 状态不只靠颜色

- 问题：已购/无效/等级主要靠色块。
- 动作：标签同时保留文字（已有部分）；色盲友好对比即可，不强改色板。

### T-20 底栏/列表留白

- 问题：管理弹层已有 `safe-area`；大厅/订单长列表最后一项可能贴边。
- 动作：列表容器补 `padding-bottom`（含 tabBar + safe-area）。

### T-21 发布标签「添加」改为按钮

- 问题：第二步「添加」是 `text`。
- 文件：`opportunity/publish.vue`
- 动作：改为可点按钮，高度 ≥44pt。

---

## 实施顺序

1. T-02、T-03、T-04、T-05（功能错误，改动面小）
2. T-01（资源与底栏）
3. T-06、T-07、T-08
4. T-09、T-10、T-11
5. T-12 ～ T-18
6. T-19 ～ T-21

每完成一组：H5 对应页点验；涉及登录/发布的做一次手工提交防连点。不改后端契约，除非 T-16 要读系统配置。

## 不做（本计划外）

- 方案 B 分佣合入（在 `260905-feat-admin-pc`，与本分支 018 冲突）
- 真实微信支付开通
- 管理端独立 PC（本分支无 `admin-pc/`）
- 通知 11 场景、举报处理台、订单导出（历史 P2 功能债）
