import { Router } from 'express';
import { query, queryOne, update, transaction } from '../../db.js';

const router = Router();

// 获取待审核摘要列表
router.get('/follow-up-shares', async (req, res) => {
  try {
    const { status = 'pending', page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let sql = `SELECT s.*, u.nickname as user_name, o.title as opportunity_title
               FROM follow_up_shares s
               LEFT JOIN users u ON s.user_id = u.id
               LEFT JOIN opportunities o ON s.opportunity_id = o.id
               WHERE s.audit_status = ?`;
    const params = [status];

    sql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(pageSize), offset);

    const list = await query(sql, params);

    const [countResult] = await query(
      'SELECT COUNT(*) as total FROM follow_up_shares WHERE audit_status = ?',
      [status]
    );

    res.json({
      code: 0,
      data: {
        list,
        total: countResult.total,
        page: Number(page),
        pageSize: Number(pageSize),
      },
    });
  } catch (err) {
    console.error('Admin get audit list error:', err);
    res.status(500).json({ code: 500, message: '获取审核列表失败' });
  }
});

// 审核摘要
router.put('/follow-up-shares/:id', async (req, res) => {
  try {
    const { status, reason } = req.body || {};
    if (!['approved', 'rejected'].includes(status)) {
      return res.json({ code: 400, message: '审核状态无效' });
    }

    const share = await queryOne('SELECT * FROM follow_up_shares WHERE id = ?', [req.params.id]);
    if (!share) {
      return res.json({ code: 404, message: '摘要不存在' });
    }

    await update('follow_up_shares', {
      audit_status: status,
      audit_reason: reason || '',
    }, 'id = ?', [req.params.id]);

    // 如果通过，给奖励积分
    if (status === 'approved') {
      const [rewardConfig] = await query(
        "SELECT config_value FROM system_configs WHERE config_key = 'share_reward_points'"
      );
      const rewardPoints = parseInt(rewardConfig[0]?.config_value || '2');
      
      if (rewardPoints > 0) {
        await transaction(async (conn) => {
          await conn.execute(
            'UPDATE points_accounts SET balance = balance + ? WHERE user_id = ?',
            [rewardPoints, share.user_id]
          );
          const [account] = await conn.execute(
            'SELECT balance FROM points_accounts WHERE user_id = ?',
            [share.user_id]
          );
          await conn.execute(
            `INSERT INTO points_logs (user_id, delta, balance_after, source_type, source_title)
             VALUES (?, ?, ?, 'reward', '共享摘要审核通过奖励')`,
            [share.user_id, rewardPoints, account[0].balance]
          );
        });
      }
    }

    res.json({ code: 0, message: '审核完成' });
  } catch (err) {
    console.error('Admin audit share error:', err);
    res.status(500).json({ code: 500, message: '审核失败' });
  }
});

export default router;
