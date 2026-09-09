#!/bin/bash
set -e

# 复制环境变量配置
if [ ! -f .env ]; then
  cp .env.example .env
  echo "[deploy] 已生成 .env，请检查并修改其中密钥"
fi

# 启动服务
docker compose up -d --build

echo ""
echo "[deploy] 服务已启动"
echo "  前端:  http://localhost:${WEB_PORT:-8080}"
echo "  后台:  http://localhost:${WEB_PORT:-8080}/admin"
echo ""
echo "  查看日志: docker compose logs -f"
echo "  停止服务: docker compose down"
