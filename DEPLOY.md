# Docker 部署指南

本文档描述如何将本项目以 Docker Compose 方式部署到云服务器（腾讯云 VPS 等）。

## 架构说明

| 服务 | 镜像/构建 | 职责 |
|------|-----------|------|
| `mysql` | mysql:8.0 | 数据库，数据持久化到 `mysql_data` volume，带健康检查 |
| `api` | `./server` 构建 | Node.js 后端，启动时自动执行 migration 与种子数据 |
| `web` | `./client` 构建 | Vite 多阶段构建出静态文件，nginx 托管并反代 |

请求链路：浏览器 → `web`(nginx:80) → `/api`、`/uploads` 反代到 `api`:3001；SPA 路由由 nginx 回退到 `index.html`。

持久化 volume：

- `mysql_data` — 数据库全部数据
- `uploads` — 用户上传文件（对应容器内 `/app/uploads`）

## 前置要求

- 服务器已安装 Docker 与 Docker Compose v2：

```bash
curl -fsSL https://get.docker.com | sh
```

- （可选）一个已解析到服务器公网 IP 的域名。支付回调（Waffo webhook）与正式环境 HTTPS 必须使用域名。

## 部署步骤

### 1. 获取代码

```bash
git clone https://github.com/xyhw/crm.git && cd crm
```

### 2. 配置密钥

```bash
cp .env.docker.example .env && vi .env
```

`.env` 各项必须全部替换为强随机值（生成方式 `openssl rand -hex 32`）：

```env
MYSQL_ROOT_PASSWORD=<root密码>
DB_PASS=<业务账号密码>
JWT_SECRET=<登录令牌密钥>
REFRESH_SECRET=<刷新令牌密钥>
ADMIN_SECRET=<后台令牌密钥>
```

注意：`.env` 已被 gitignore，严禁提交到仓库。

### 3. 构建并启动

```bash
docker compose up -d --build
```

首次启动会自动完成：建库建表（migration 001-011）、种子数据灌入。无需手工初始化数据库。

### 4. 验证

```bash
# 三服务应为 running 且 api/web/mysql 均为 (healthy)（崩溃时 unless-stopped 会自动重启，持续不健康说明配置有误）
docker compose ps

# 观察 api 日志出现 "listening on http://localhost:3001" 且无报错
docker compose logs -f api
```

`/api/health` 会真实探测数据库连接，返回 `code: 0` 才视为健康；数据库故障时 compose 会标记为 unhealthy。

浏览器访问 `http://<VPS公网IP>` 确认页面正常、能注册登录。

## 上线前检查清单

上线前逐项确认，避免正式对客时才暴露问题：

1. **域名与 HTTPS**：支付回调要求 HTTPS，正式域名解析到服务器后配置 TLS（见下方 HTTPS 一节）
2. **强随机密钥**：`.env` 五个密钥全部用 `openssl rand -hex 32` 生成，且 `.env` 不提交到 git
3. **默认管理员密码**：部署前在 `.env` 设置 `ADMIN_INIT_PASSWORD`（首启创建 `admin` 账号的初始密码）；否则会使用默认密码 `admin123` 并在日志输出安全警告，**务必上线后第一时间在后台修改**
3. **邮件 SMTP**：`.env` 中 `MAIL_PROVIDER=smtp` 并填 `MAIL_SMTP_HOST/USER/PASS`；保持 `log` 时验证码只会打印到 api 日志，用户收不到找回密码邮件——**务必实测找回密码全链路**
4. **支付配置**：在管理后台完成下面的「上线后必做的配置切换」（站点域名、Waffo 生产渠道、webhook）
5. **恢复演练**：执行一次备份并尝试恢复到临时库，确认备份脚本可用（备份命令见下文）
6. **冷启动巡检**：清空 volume 后 `docker compose up -d --build` 完整跑一遍，核对 migration 日志无报错、种子数据就绪、三个服务都 healthy

## 上线后必做的配置切换

在管理后台「系统配置」中完成：

1. **站点域名**（pay_site_base_url）填入正式域名，如 `https://example.com`
2. **Waffo 支付成功跳转URL** 清空（清空后自动基于站点域名拼接 `/points`）
3. **Waffo 环境** 切换为 `prod` 并替换为生产 Merchant ID / Store ID / 私钥（test 密钥无法用于生产收款）
4. 到 Waffo 平台侧把 **webhook URL** 更新为 `https://<正式域名>/api/points/recharge/notify/waffo`，事件选 `order.completed`

## HTTPS

支付生产环境要求回调地址为 HTTPS，任选其一：

- **certbot**：宿主机安装 certbot，为 nginx 挂载证书，或在 web 容器前再加一层宿主机 nginx/caddy 终结 TLS
- **腾讯云 CLB**：负载均衡挂免费证书，回源到服务器 80 端口

## 常用运维命令

```bash
# 查看实时日志
docker compose logs -f api

# 更新代码后重新部署
git pull && docker compose up -d --build

# 重启单个服务
docker compose restart api

# 备份数据库（导出到宿主机当前目录）
docker compose exec mysql sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" hotel_order_follow' > backup_$(date +%F).sql

# 恢复数据库备份
docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" hotel_order_follow' < backup_xxxx.sql
```

## 故障排查

| 现象 | 排查方向 |
|------|----------|
| api 反复重启 | `docker compose logs api` 看 migration 报错，常见为 `.env` 缺少密钥项 |
| 页面空白或接口 404 | `docker compose ps` 确认三服务均运行；检查 web 的 nginx 是否正常反代 |
| 登录报 429 | 登录接口有限流，调试期可给 api 服务加环境变量 `RATE_LIMIT_LOGIN_MAX=999999` |
| 数据丢失 | 确认未执行 `docker compose down -v`（`-v` 会删除 volume，数据库与上传文件一并清除） |
