import { query, queryOne, getConnection } from './db.js';
import { recalculateAllLevels } from './services/level.service.js';

class Scheduler {
  constructor() {
    this.jobs = [];
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    console.log('[Scheduler] 服务启动');

    this.jobs.push(
      setInterval(() => this.recalculateLevels(), 24 * 60 * 60 * 1000)
    );
    this.jobs.push(
      setInterval(() => this.cleanExpiredPoints(), 24 * 60 * 60 * 1000)
    );
    this.jobs.push(
      setInterval(() => this.cleanExpiredNotifications(), 24 * 60 * 60 * 1000)
    );

    setTimeout(() => this.recalculateLevels(), 5000);
  }

  stop() {
    this.jobs.forEach(clearInterval);
    this.jobs = [];
    this.running = false;
    console.log('[Scheduler] 服务停止');
  }

  async cleanExpiredPoints() {
    console.log('[Scheduler] 开始清理过期积分');
    try {
      const configResult = await query(
        'SELECT config_value FROM system_configs WHERE config_key = ?',
        ['points_expire_days']
      );
      const config = Array.isArray(configResult) ? configResult[0] : configResult;
      const expiryDays = parseInt(config?.config_value || '180');

      const expiredResult = await query(
        `SELECT id, user_id, delta FROM points_logs
         WHERE delta > 0
         AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [expiryDays]
      );
      const expiredLogs = Array.isArray(expiredResult) ? expiredResult : [];

      if (expiredLogs.length === 0) {
        console.log('[Scheduler] 无过期积分');
        return;
      }

      const connection = await getConnection();
      try {
        await connection.beginTransaction();

        for (const log of expiredLogs) {
          await connection.query(
            `INSERT INTO points_logs (user_id, delta, source_type, source_id, source_title, balance_after)
             SELECT ?, -?, 'expiry', 0, '积分过期', balance FROM points_accounts WHERE user_id = ?`,
            [log.user_id, log.delta, log.user_id]
          );

          await connection.query(
            'UPDATE points_accounts SET balance = balance - ?, total_expired = total_expired + ? WHERE user_id = ? AND balance >= ?',
            [log.delta, log.delta, log.user_id, log.delta]
          );
        }

        await connection.commit();
        console.log(`[Scheduler] 过期积分清理完成，处理 ${expiredLogs.length} 条记录`);
      } catch (error) {
        await connection.rollback();
        console.error('[Scheduler] 过期积分清理失败:', error.message);
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('[Scheduler] 过期积分查询失败:', error.message);
    }
  }

  async cleanExpiredNotifications() {
    console.log('[Scheduler] 开始清理过期通知');
    try {
      const result = await query(
        'DELETE FROM notifications WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY) AND is_read = 1'
      );
      const affectedRows = result?.affectedRows || 0;
      console.log(`[Scheduler] 过期通知清理完成，删除 ${affectedRows} 条`);
    } catch (error) {
      console.error('[Scheduler] 通知清理失败:', error.message);
    }
  }

  async recalculateLevels() {
    console.log('[Scheduler] 开始等级重算');
    try {
      const result = await recalculateAllLevels();
      console.log(`[Scheduler] 等级重算完成，处理 ${result.updated}/${result.total} 个用户`);
    } catch (error) {
      console.error('[Scheduler] 等级重算失败:', error.message);
    }
  }
}

const scheduler = new Scheduler();
export default scheduler;
