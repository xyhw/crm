# 部署说明

> 2026-09 梳理：本目录原有的独立 Dockerfile / docker-compose.yml（mariadb:10.11、
> npm install 不可复现构建、uploads 卷挂载错位导致重新部署丢文件、硬编码默认密钥）
> 已删除。**统一使用仓库根目录的 `docker-compose.yml`**（mysql:8.0、npm ci 锁定
> 构建、三服务健康检查、无默认密钥），完整文档见 [`../DEPLOY.md`](../DEPLOY.md)。

## 快速开始

```bash
cd deploy
bash start.sh
```

脚本会自动：
1. 复制 `.env.docker.example` 为 `.env`（首次运行，需填密钥）
2. 构建前后端镜像（`crm/api`、`crm/web`）
3. 启动 MySQL、后端（Node）、前端（Nginx）三个服务

## 访问地址

| 服务 | 地址 |
|------|------|
| 用户端 H5 | http://localhost/ |
| 管理后台 | http://localhost/admin |
| 后端 API | http://localhost/api/health |

默认管理员账号：`admin / admin123`（首次登录后请修改）。

## 重新打包镜像

```bash
# 带版本 tag 构建（产物：crm/api:v1.0.0、crm/web:v1.0.0）
APP_VERSION=v1.0.0 docker compose build --no-cache

# 推送到镜像仓库（以 Docker Hub 为例）
docker tag crm/api:v1.0.0 <registry>/crm-api:v1.0.0
docker tag crm/web:v1.0.0 <registry>/crm-web:v1.0.0
docker push <registry>/crm-api:v1.0.0 && docker push <registry>/crm-web:v1.0.0
```
