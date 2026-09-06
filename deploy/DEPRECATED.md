# ⚠️ DEPRECATED — 此目录已废弃，请勿使用

本目录是早期备用部署方案，**已停止维护**，存在以下问题：

- 使用 `mariadb:10.11`（正式方案为 `mysql:8.0`，两者行为有差异）
- `.env.example` 内置**弱默认密钥**（`hotel-order-follow-prod-secret-change-me` 等），直接使用有安全风险
- 前端镜像仍构建已冻结的 `client/`（方案A 已确定 miniapp 为唯一前端）
- 环境变量覆盖不全（缺 REFRESH_SECRET、邮件、微信支付系列）

**请统一使用仓库根目录的 `docker-compose.yml`**（mysql:8.0 + api + web(miniapp H5)，
含健康检查、完整环境变量与密钥强制校验），参见根目录 `DEPLOY.md`。

本目录仅保留作历史参考；确认无需回溯后可整体删除。
