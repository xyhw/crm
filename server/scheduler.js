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
    this.jobs.push(
      setInterval(() => this.reconcileWechatOrders(), 5 * 60 * 1000)
    );
    // P0-4：每日信用分巡检（<40 自动封禁）+ 周活跃加分（近7天登录≥3天 +1）
    this.jobs.push(
      setInterval(() => this.dailyCreditSweep(), 24 * 60 * 60 * 1000)
    );
    this.jobs.push(
      setInterval(() => this.weeklyActiveBonus(), 24 * 60 * 60 * 1000)
    );
    // 每日清理已过期的吊销 token 记录（服务端登出）
    this.jobs.push(
      setInterval(() => this.cleanExpiredRevokedTokens(), 24 * 60 * 60 * 1000)
    );

    setTimeout(() => this.recalculateLevels(), 5000);
    setTimeout(() => this.reconcileWechatOrders(), 30 * 1000);
  }

  stop() {
    this.jobs.forEach(clearInterval);
    this.jobs = [];
    this.running = false;
    console.log('[Scheduler] 服务停止');
  }

  // 清理 expires_at 已过的吊销 token 行（登出后 token 自然过期，无需永久保存）
  async cleanExpiredRevokedTokens() {
    try {
      const result = await query('DELETE FROM revoked_tokens WHERE expires_at < NOW()');
      if (result.affectedRows > 0) {
        console.log(`[Scheduler] 过期吊销 token 清理完成，删除 ${result.affectedRows} 条`);
      }
    } catch (error) {
      console.error('[Scheduler] 过期吊销 token 清理失败:', error.message);
    }
  }

  async cleanExpiredPoints() {
    console.log('[Scheduler] 开始清理过期积分');
    try {
      // P0-1 新规则：仅奖励类积分有有效期（入账时已设 expires_at）；
      // 充值/分佣/人工调整永久有效（expires_at IS NULL 永不过期，不再按天数扫全表）
      const expiredResult = await query(
        `SELECT id, user_id, delta FROM points_logs
         WHERE delta > 0
         AND expires_at IS NOT NULL
         AND expires_at <= NOW()`,
        []
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
             SELECT ?, -?, 'expire', 0, '积分过期', balance FROM points_accounts WHERE user_id = ?`,
            [log.user_id, log.delta, log.user_id]
          );

          await connection.query(
            'UPDATE points_accounts SET balance = balance - ?, total_expired = total_expired + ? WHERE user_id = ? AND balance >= ?',
            [log.delta, log.delta, log.user_id, log.delta]
          );

          await connection.query(
            'UPDATE points_logs SET expires_at = NOW() WHERE id = ?',
            [log.id]
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

  // P0-4：每日信用分巡检——<40 自动封禁（需求 5.7）。
  // 现有封禁只在“被标记无效”时触发，此巡检补齐其他扣分路径（如 -5 摘要举报确认）后的复查
  async dailyCreditSweep() {
    console.log('[Scheduler] 开始信用分巡检');
    try {
      const banConfig = await query(
        "SELECT config_value FROM system_configs WHERE config_key = 'credit_ban_threshold'"
      );
      const banRow = Array.isArray(banConfig) ? banConfig[0] : banConfig;
      const banThreshold = parseInt(banRow?.config_value || '40', 10);

      const rows = await query(
        `SELECT id FROM users WHERE status = 'active' AND credit_score < ?`,
        [banThreshold]
      );
      const toBan = Array.isArray(rows) ? rows : [];
      if (toBan.length === 0) {
        console.log('[Scheduler] 信用分巡检完成，无需封禁');
        return;
      }

      const connection = await getConnection();
      try {
        await connection.beginTransaction();
        for (const user of toBan) {
          await connection.query(
            'UPDATE users SET status = ? WHERE id = ? AND status = ?',
            ['banned', user.id, 'active']
          );
          await connection.query(
            `INSERT INTO notifications (user_id, type, title, content)
             VALUES (?, 'system', '账号已被封禁', ?)`,
            [user.id, `您的信用分低于 ${banThreshold} 分，账号已被封禁。如有疑问请联系平台客服。`]
          );
        }
        await connection.commit();
        console.log(`[Scheduler] 信用分巡检完成，封禁 ${toBan.length} 个账号`);
      } catch (error) {
        await connection.rollback();
        console.error('[Scheduler] 信用分巡检封禁失败:', error.message);
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('[Scheduler] 信用分巡检失败:', error.message);
    }
  }

  // P0-4：周活跃加分——近 7 天登录≥3 天 +1 信用分/周（需求 5.7）。
  // 幂等：本周已发过 weekly_active 则跳过。惩戒用户的恢复路径
  async weeklyActiveBonus() {
    console.log('[Scheduler] 开始周活跃加分');
    try {
      const rows = await query(
        `SELECT u.id, u.credit_score FROM users u
         WHERE u.status = 'active'
           AND u.credit_score < 100
           AND (SELECT COUNT(DISTINCT login_date) FROM user_login_days
                WHERE user_id = u.id AND login_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)) >= 3
           AND NOT EXISTS (
             SELECT 1 FROM user_credits
             WHERE user_id = u.id AND source_type = 'weekly_active'
               AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
           )`
      );
      const toReward = Array.isArray(rows) ? rows : [];
      if (toReward.length === 0) {
        console.log('[Scheduler] 周活跃加分完成，无符合条件用户');
        return;
      }

      const connection = await getConnection();
      try {
        await connection.beginTransaction();
        for (const user of toReward) {
          await connection.query(
            'UPDATE users SET credit_score = LEAST(100, credit_score + 1) WHERE id = ?',
            [user.id]
          );
          await connection.query(
            `INSERT INTO user_credits (user_id, credit_score, change_amount, change_reason, source_type)
             SELECT id, credit_score, 1, '持续活跃（周登录≥3天）', 'weekly_active' FROM users WHERE id = ?`,
            [user.id]
          );
        }
        await connection.commit();
        console.log(`[Scheduler] 周活跃加分完成，奖励 ${toReward.length} 个用户 +1 信用分`);
      } catch (error) {
        await connection.rollback();
        console.error('[Scheduler] 周活跃加分失败:', error.message);
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('[Scheduler] 周活跃加分失败:', error.message);
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

  async reconcileWechatOrders() {
    try {
      const { getAdapter, settleRechargeOrder } = await import('./services/payment/index.js');
      const { listPendingWechatOrders } = await import('./services/payment/wechat.js');
      const adapter = getAdapter('wechat');
      if (!adapter.isConfigured()) return;
      const rows = await listPendingWechatOrders(30);
      if (!rows.length) return;
      console.log(`[Scheduler] 虚拟支付查单兜底，待处理 ${rows.length} 笔`);
      for (const row of rows) {
        if (!row.openid) continue;
        try {
          const result = await adapter.queryOrder({ orderNo: row.order_no, openid: row.openid });
          if (result.status === 'paid') {
            await settleRechargeOrder(row.order_no, {
              payChannelOrderNo: result.payChannelOrderNo,
              paidAt: result.paidAt,
              rawNotify: result.raw,
            });
          }
        } catch (err) {
          console.error(`[Scheduler] 虚拟支付查单失败 ${row.order_no}:`, err.message);
        }
      }
    } catch (error) {
      console.error('[Scheduler] 虚拟支付查单兜底失败:', error.message);
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
