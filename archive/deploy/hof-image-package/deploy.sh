#!/usr/bin/env bash
#
# HOF 一键部署脚本（离线镜像包版）
# 用法: ./deploy.sh
#
set -euo pipefail

cd "$(dirname "$0")"

echo "==> [1/4] 检查 docker"
if ! command -v docker >/dev/null 2>&1; then
  echo "错误: 未安装 docker，请先执行 curl -fsSL https://get.docker.com | sh"
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "警告: 未找到 docker compose v2，将回退到 docker-compose"
  COMPOSE="docker-compose"
else
  COMPOSE="docker compose"
fi
C=$COMPOSE

echo "==> [2/4] 检查镜像"
if ! docker images | grep -q 'hof-api'; then
  echo "导入 hof-images.tar.gz ..."
  gunzip -c hof-images.tar.gz | docker load
fi

echo "==> [3/4] 检查 .env"
if [ ! -f .env ]; then
  echo "复制 .env.example -> .env"
  cp .env.example .env
  echo "警告: 请编辑 .env，填入 MYSQL_ROOT_PASSWORD / DB_PASS / JWT_SECRET / REFRESH_SECRET / ADMIN_SECRET / ADMIN_INIT_PASSWORD 等生产配置后重跑本脚本"
  exit 1
fi

echo "==> [4/4] 启动"
$C up -d

echo ""
echo "等待服务健康 ..."
sleep 10
$C ps