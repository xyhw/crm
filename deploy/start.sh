#!/bin/bash
# 一键部署包装脚本：统一走仓库根目录的 docker-compose.yml（canonical 栈）
# deploy/ 旧有的独立 Dockerfile/compose（mariadb 镜像、npm install 不可复现构建、
# uploads 卷挂载错位丢文件、硬编码默认密钥）已删除，详见 ../DEPLOY.md
set -e

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  cp .env.docker.example .env
  echo "[deploy] 已生成 .env，请检查并修改其中密钥后重新执行"
  exit 1
fi

# 构建并启动（APP_VERSION 可控制镜像 tag，如 APP_VERSION=v1.0.0）
docker compose up -d --build

echo ""
echo "[deploy] 服务已启动"
echo "  用户端 H5:   http://localhost/"
echo "  管理后台:    http://localhost/admin"
echo "  后端 API:    http://localhost/api/health"
echo ""
echo "  重新打包:     APP_VERSION=v1.0.0 docker compose build --no-cache"
echo "  查看日志:     docker compose logs -f"
echo "  停止服务:     docker compose down"
