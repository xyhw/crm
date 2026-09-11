# HOF 部署说明（离线镜像包）

## 目录内容

```
hof-image-package/
├── hof-images.tar.gz    # 3 个业务镜像（hof-api 168MB + hof-web 69.8MB + hof-admin-pc 69.2MB，压缩后 80MB）
├── docker-compose.yml   # 4 服务编排（mysql / api / web / web-admin）
├── .env.example         # 配置模板
├── deploy.sh            # 一键部署脚本
└── README-DEPLOY.md     # 本说明
```

## 需要打包的镜像

| 镜像 | 说明 | 是否需要打包 |
|------|------|-------------|
| `hof-api:latest` | 后端 API（Node.js + Express） | ✅ 已打包 |
| `hof-web:latest` | 用户端 H5（uni-app + nginx） | ✅ 已打包 |
| `hof-admin-pc:latest` | PC 管理后台（Vue3 + nginx） | ✅ 已打包 |
| `mysql:8.0` | MySQL（Docker 官方，新机自动拉取） | ❌ 无需打包 |

## 部署步骤（新机器）

### 1. 安装 Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

在国内服务器加镜像加速（加速 mysql:8.0 拉取）：

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://mirror.ccs.tencentyun.com"
  ]
}
EOF
sudo systemctl restart docker
```

### 2. 上传部署包

```bash
scp -r hof-image-package user@server:/opt/hof-image-package
```

### 3. 配置 .env

```bash
cd /opt/hof-image-package
cp .env.example .env
```

编辑 `.env`，至少改这些（密钥用 `openssl rand -hex 32` 生成）：

- `MYSQL_ROOT_PASSWORD` / `DB_PASS`
- `JWT_SECRET` / `REFRESH_SECRET` / `ADMIN_SECRET`
- `ADMIN_INIT_PASSWORD`
- `CORS_ORIGINS`（改成真实域名）
- `MAIL_PROVIDER` / SMTP 相关（生产用 smtp）

### 4. 部署

```bash
./deploy.sh
```

脚本会自动：检查 docker → 导入镜像（如未导入）→ 检查 .env → 启动。

### 5. 验证

```bash
# 等待服务 healthy
docker compose ps

# API 健康检查
curl http://localhost/api/health
# 期望: {"code":0,"data":{"status":"ok","db":"up"}}

# 前端首页
curl -I http://localhost/
# 期望: HTTP/1.1 200 OK

# PC 管理后台
curl -I http://localhost:8080/
# 期望: HTTP/1.1 200 OK

# 管理后台登录（经 8080 反代到 api）
curl -s -X POST http://localhost:8080/api/v1/admin/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"<ADMIN_INIT_PASSWORD 值>"}'
# 期望: {"code":0,"data":{"token":"..."}}
```

### 6. 域名 + HTTPS

前端监听 80 端口。生产用 nginx 或云负载均衡加 HTTPS，反代到 `127.0.0.1:80`。示例：

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 7. 首次登录

- 用户端 H5：`http://yourdomain.com`（或 `https://yourdomain.com`）
- PC 管理后台：`http://yourdomain.com:8080`（用 nginx 反代到 8080 可去掉端口）
- admin 初始账号：`admin`，密码为 `ADMIN_INIT_PASSWORD` 配置值，登录后立即修改。

## 常用运维命令

```bash
docker compose ps               # 查看状态
docker compose logs -f api      # 查看 api 日志
docker compose logs -f web      # 查看 web 日志
docker compose logs -f web-admin # 查看管理后台日志
docker compose logs -f mysql    # 查看 mysql 日志
docker compose restart api      # 重启 api
docker compose down             # 停止（保留数据卷）
docker compose down -v          # 停止并删除数据卷（清空数据库，慎用）
```

## 数据持久化

- MySQL 数据：`mysql_data` 卷
- 上传文件：`uploads` 卷

都通过命名卷持久化，容器重建不丢数据。备份方式：

```bash
# 备份数据库
docker exec hof-mysql sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" hotel_order_follow' > backup.sql
```