#!/usr/bin/env bash
# 数据库与上传文件定时备份（配合 crontab 使用）
#
# 安装示例（每天 03:00 执行）：
#   crontab -e
#   0 3 * * * cd /path/to/project && BACKUP_DIR=/opt/backups/hof KEEP_DAYS=14 ./deploy/backup.sh >> /var/log/hof-backup.log 2>&1
#
# 恢复（示例）：
#   gunzip < /opt/backups/hof/db-20260906-030001.sql.gz | \
#     docker compose exec -T mysql sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" hotel_order_follow'
#   docker compose exec -T api sh -c 'cd /app && tar xzf -' < /opt/backups/hof/uploads-20260906-030001.tar.gz
#
# 建议定期将 $BACKUP_DIR 同步到异地/对象存储，并至少演练一次完整恢复。
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/backups/hof}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%F %T')] backup start"

# 1) 数据库逻辑备份（单事务一致性快照）
docker compose exec -T mysql sh -c \
  'exec mysqldump --single-transaction --routines --triggers -uroot -p"$MYSQL_ROOT_PASSWORD" hotel_order_follow' \
  | gzip > "$BACKUP_DIR/db-$STAMP.sql.gz"

# 2) 上传文件打包（uploads volume 同时挂载在 api:/app/uploads）
docker compose exec -T api sh -c 'cd /app && tar czf - uploads' \
  > "$BACKUP_DIR/uploads-$STAMP.tar.gz"

# 3) 轮转清理：删除超过保留期的备份
find "$BACKUP_DIR" -name 'db-*.sql.gz' -mtime "+$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name 'uploads-*.tar.gz' -mtime "+$KEEP_DAYS" -delete

echo "[$(date '+%F %T')] backup done -> $BACKUP_DIR/db-$STAMP.sql.gz"
