# 方案 B 实施任务列表

1. [x] [数据] migration 018_plan_b_levels.js：增列、两档重建、用户映射、ENUM 收紧、配置清理、惩罚率调整；index.js 注册（按状态逐项收敛，幂等；seed 保持旧形状、018 在 seed 后归一）
2. [x] [服务] level.service：getSellerCommissionRate / calculateSellerEarnings 改签名 (sellerId, originalPrice, finalPrice) / getPurchasePrice 新口径 / recalculateAllLevels 降序命中修复
3. [x] [路由] order.routes 记账换新（seller_income=全额、level_bonus=0、platform_rate=留存率）；admin/level.routes 白名单换 sellerCommissionRate + 防穿仓校验 + name；opportunity.routes penalty 兜底 0.20
4. [x] [种子] seed.js 系统配置同步（删两键、penalty 0.20 与回扣说明）；等级保持旧四档形状由 018 归一
5. [x] [PC] LevelsView（分佣率列/表单/校验文案）、ConfigsView（删两键、组名、penalty 语义）适配
6. [x] [H5] constants.LEVEL_META 两档、community/level.vue 阈值文案、detail.vue discountByLevel、pages/admin/configs.vue 适配
7. [x] [测试] admin-fixes P0-1 用例重写（两档参数/解耦/改率即时生效/预览一致）；body-fields 示例字段同步；全量 99 例回归通过
8. [x] [文档] .monkeycode/docs/分佣逻辑与测算.md 重写为定价制；requirements §5.6/§5.8/§5.10 回写
9. [x] [验证] 后端重启迁移收敛确认；admin-pc build 通过；miniapp dev:h5 HMR 无错；真实购买冒烟 SMOKE_PASS（定价100 → seller_income=76、level_bonus=0、platform_commission=24、platform_rate=0.24），数据已清理
