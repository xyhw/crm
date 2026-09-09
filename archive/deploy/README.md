# 部署说明

使用 Docker Compose 一键部署前后端与数据库。

## 前置要求

- Docker 20.10+
- Docker Compose v2

## 快速开始

```bash
cd deploy
bash start.sh
```

脚本会自动：
1. 复制 `.env.example` 为 `.env`（首次运行）
2. 构建前端与后端镜像
3. 启动 MySQL、后端（Node）、前端（Nginx）三个服务

## 访问地址

| 服务 | 地址 |
|------|------|
| 前端 H5 | http://localhost:8080 |
| 管理后台 | http://localhost:8080/admin |
| 后端 API | http://localhost:8080/api |

默认管理员账号：`admin / admin123`（首次登录后请修改）

## 配置说明

编辑 `deploy/.env` 文件可调整：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `WEB_PORT` | 对外暴露端口 | 8080 |
| `DB_NAME` | 数据库名 | hotel_order_follow |
| `DB_USER` / `DB_PASS` | 数据库账号 | hof_user / hof_pass_2026 |
| `JWT_SECRET` | JWT 签名密钥 | 请务必修改 |
| `ADMIN_SECRET` | 管理端签名密钥 | 请务必修改 |

## 数据持久化

- MySQL 数据：`mysql_data` 卷
- 上传文件：`uploads_data` 卷（挂载到后端的 `/workspace/uploads`）

## 常用命令

```bash
# 查看日志
docker compose logs -f backend

# 查看全部服务状态
docker compose ps

# 停止服务
docker compose down

# 停止并删除数据卷（慎用）
docker compose down -v
```

## 生产注意事项

- 修改 `.env` 中 `JWT_SECRET` 与 `ADMIN_SECRET` 为随机强密码
- 修改默认管理员密码
- 如需 HTTPS，请在前置负载均衡或 Nginx 处配置证书
