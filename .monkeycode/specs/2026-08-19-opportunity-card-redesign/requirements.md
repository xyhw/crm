# Requirements Document

## Introduction

重构商机大厅（Hall）的商机卡片为「方案 A：信息卡片流」，即左图右文单栏布局。卡片在标题、meta、价格与统计之间建立清晰的分层，便于用户扫描与对比；已购买（已解锁）商机以绿色视觉主题区分，同时保证文字可读性不受背景影响。

本次是纯前端视觉重构，涉及 `client/src/pages/Hall.jsx` 结构与 `client/src/styles/global.css` 样式，不改变后端接口与数据模型。

## Glossary

- **商机卡片**：商机大厅中每一条商机的展示单元。
- **已解锁（isPurchased）**：当前登录用户已购买该商机。
- **meta**：卡片中品牌、城市、阶段等次要信息行。
- **分类图标（categoryIcon）**：商机分类对应的 emoji 图标。

## Requirements

### Requirement 1：卡片采用左图右文信息流布局

**User Story:** AS 浏览者, I want 每张商机卡片信息分层清晰, so that 能快速扫描标题并对比价格。

#### Acceptance Criteria

1. WHEN 卡片渲染，THE 卡片 SHALL 使用左图右文单栏布局，左侧为 44px 圆角分类图标块，右侧为该商机的文字信息。
2. WHEN 卡片标题超出单行，THE 标题 SHALL 单行截断并显示省略号。
3. WHEN 卡片渲染 meta 行，THE 卡片 SHALL 依次展示品牌、城市、阶段标签。

### Requirement 2：卡片底部信息带

**User Story:** AS 浏览者, I want 价格与购买统计在卡片底部清晰呈现, so that 能快速判断商机热度与成本。

#### Acceptance Criteria

1. WHEN 卡片渲染底部信息带，THE 卡片 SHALL 以分隔线区分头部与底部。
2. WHEN 底部信息带渲染，THE 卡片 SHALL 左侧展示价格积分，右侧展示购买人数统计与发布时间。
3. WHEN 商机未购买，THE 价格 SHALL 带锁图标以暗示需购买。

### Requirement 3：已解锁状态视觉区分

**User Story:** AS 已购买用户, I want 已购买的商机在列表中一眼可辨, so that 不会重复购买且能快速回到已解锁商机。

#### Acceptance Criteria

1. WHEN 商机已购买，THE 卡片 SHALL 使用浅绿色背景与左侧绿色边框作为主题。
2. WHEN 商机已购买，THE 标题 SHALL 前置绿色对勾标记并附带「已解锁」标签。
3. WHEN 商机已购买，THE 卡片 SHALL 保持正文文字为深色且清晰可读。
4. WHEN 已购买商机存在未读共享跟进，THE 卡片 SHALL 展示「N 条新共享跟进」提醒，且提醒样式与已购态共存。
5. WHEN 商机标题下存在阶段/品牌等 meta，THE 卡片 SHALL 保持该 meta 正常可读。

### Requirement 4：状态一致性

**User Story:** AS 用户, I want 卡片状态与商机详情一致, so that 不会产生状态歧义。

#### Acceptance Criteria

1. WHEN 卡片渲染，THE 卡片 SHALL 与商机详情页使用一致的「已解锁/未购买」状态含义。
2. WHEN 点击卡片，THE 卡片 SHALL 跳转至对应商机详情页。