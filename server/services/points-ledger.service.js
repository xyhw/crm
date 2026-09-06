/**
 * 积分账务公共服务：统一「调余额 + 写流水（balance_after 实时快照）」模式，
 * 替代散落在 auth/order/follow-up/opportunity/audit/user/payment 中的 9 处复制实现。
 *
 * 所有函数均要求在事务连接（conn）内调用，保证「调余额 + 写流水」原子性。
 * source_type 取值须为 points_logs 枚举（001/005/009 迁移定义：register_gift/invite_gift/
 * commission/reward/consume/expire/recharge/refund/admin_adjust/penalty）。
 */

export async function ensurePointsAccount(conn, userId) {
  await conn.execute('INSERT IGNORE INTO points_accounts (user_id, balance, total_consumed) VALUES (?, 0, 0)', [userId]);
}

async function getBalance(conn, userId) {
  const [rows] = await conn.execute('SELECT balance FROM points_accounts WHERE user_id = ?', [userId]);
  return rows[0]?.balance ?? 0;
}

/**
 * 正向入账（加分）。
 * @param {object} opts
 * @param {'total_recharged'|'total_consumed'|null} [opts.trackField] 同步累计字段
 */
export async function creditPoints(conn, { userId, delta, sourceType, sourceId = null, sourceTitle = '', trackField = null }) {
  let sql = 'UPDATE points_accounts SET balance = balance + ?';
  const params = [delta];
  if (trackField === 'total_recharged') {
    sql += ', total_recharged = total_recharged + ?';
    params.push(delta);
  } else if (trackField === 'total_consumed') {
    sql += ', total_consumed = total_consumed + ?';
    params.push(delta);
  }
  sql += ' WHERE user_id = ?';
  params.push(userId);
  await conn.execute(sql, params);

  const balance = await getBalance(conn, userId);
  await conn.execute(
    `INSERT INTO points_logs (user_id, delta, balance_after, source_type, source_id, source_title)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, delta, balance, sourceType, sourceId, sourceTitle]
  );
  return balance;
}

/**
 * 扣减（delta 为正数扣减量，流水记负值）。
 * @param {object} opts
 * @param {boolean} opts.requireBalance 余额不足（或账户不存在）时不扣减并返回 null，调用方据此回滚
 * @param {boolean} opts.allowDebt 允许扣成负数（分佣回扣/积分债务），配合 debtFloor 下限
 */
export async function debitPoints(conn, { userId, delta, sourceType, sourceId = null, sourceTitle = '', requireBalance = false, allowDebt = false, debtFloor = -999999 }) {
  let result;
  if (allowDebt) {
    [result] = await conn.execute(
      'UPDATE points_accounts SET balance = GREATEST(?, balance - ?) WHERE user_id = ?',
      [debtFloor, delta, userId]
    );
  } else if (requireBalance) {
    [result] = await conn.execute(
      'UPDATE points_accounts SET balance = balance - ?, total_consumed = total_consumed + ? WHERE user_id = ? AND balance >= ?',
      [delta, delta, userId, delta]
    );
  } else {
    [result] = await conn.execute(
      'UPDATE points_accounts SET balance = balance - ?, total_consumed = total_consumed + ? WHERE user_id = ?',
      [delta, delta, userId]
    );
  }
  if (result.affectedRows === 0) return null;

  const balance = await getBalance(conn, userId);
  await conn.execute(
    `INSERT INTO points_logs (user_id, delta, balance_after, source_type, source_id, source_title)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, -delta, balance, sourceType, sourceId, sourceTitle]
  );
  return balance;
}
