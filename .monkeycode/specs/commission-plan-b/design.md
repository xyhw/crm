# 方案 B 技术设计

## 分佣公式（新）

```
成交价     finalPrice   = round(定价 × 买家折扣)          买家折扣 ∈ {1.00, 0.85}
卖家到手   sellerIncome = round(定价 × 卖家分佣率)         分佣率 ∈ {0.76, 0.80}（来自 member_levels.seller_commission_rate）
平台留存   poolRetain   = finalPrice − sellerIncome        普通买/普通卖=24，高级买/普通卖=9，恒 ≥ 5%×定价
沉淀含义   买家实付与卖家到手之差即平台沉淀，无独立"抽成率"参数
```

等级两档（member_levels）：

| level_key | 名称 | purchase_discount | seller_commission_rate | 晋升门槛 | free_audit | mark_weight |
|---|---|---|---|---|---|---|
| normal | 普通会员 | 1.00 | 0.76 | 默认档 | 0 | 1 |
| premium | 高级会员 | 0.85 | 0.80 | purchase_rate≥30 且 invalid≤10 且 helpful≥20 且 activity≥50 | 1 | 2 |

## 数据变更（migration 018）

- `member_levels` 增列 `seller_commission_rate DECIMAL(4,2)`
- 删除 silver/gold/expert，重建 premium（normal 就地 update 参数）
- `user_level_stats.level` ENUM 扩到含 premium → 数据映射 gold/expert→premium、silver→normal → ENUM 收紧为 ('normal','premium')
- `system_configs` 删除 platform_commission_rate、seller_commission_base_rate；invalid_penalty_rate 改 0.20
- 全局安全缓冲断言在启动校验：`max(seller_commission_rate) ≤ min(purchase_discount)`

## 代码触点

- `level.service.js`：`getSellerCommissionRate(sellerId)` 取代 `calculateCommissionRate`；`calculateSellerEarnings(sellerId, originalPrice)` 改签名（不再需要 buyerId/finalPrice）；`getPurchasePrice` 预览补 sellerIncome 新口径；`recalculateAllLevels` 改为 sort_order 降序取首个命中（修 R7）
- `order.routes.js`：下单读 priceInfo.sellerIncome，settlement 记 order_amount=finalPrice、level_bonus=0、platform_commission=finalPrice−sellerIncome
- `opportunity.routes.js`：无效回扣公式不变（读 commission_settlements 实际发放和，天然兼容两代口径）
- `admin/level.routes.js`：PUT 白名单换 `sellerCommissionRate`；GET 透出
- 前后端等级展示：LEVEL_META 两档、LevelsView 表单、level.vue 文案

## 兼容性

- 历史 paid 订单 settlement 记录保持原值；对账页按存储值展示，不重算
- points_logs.commission 流水额本就是"卖家实际到手"，新口径直接写入，无枚举/表结构变化
- 前端购买按钮预估价读 getPurchasePrice 返回，字段含义变为新公式，无需改调用点
