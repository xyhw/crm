import { Router } from 'express';
import { query, queryOne, insert, update, transaction } from '../db.js';
import { authRequired } from '../auth.js';
import { isFreeAudit } from '../services/level.service.js';

const router = Router();

// 新增跟进记录
router.post('/', authRequired, async (req, res) => {
  try {
    const { crmOpportunityId, status, contentPrivate, nextFollowDate } = req.body || {};

    if (!crmOpportunityId || !contentPrivate) {
      return res.json({ code: 400, message: '请填写跟进内容' });
    }

    // 验证CRM商机归属
    const crm = await queryOne(
      'SELECT id FROM crm_opportunities WHERE id = ? AND user_id = ?',
      [crmOpportunityId, req.userId]
    );
    if (!crm) {
      return res.json({ code: 404, message: 'CRM商机不存在' });
    }

    const followUp = await insert('follow_ups', {
      crm_opportunity_id: crmOpportunityId,
      user_id: req.userId,
      status: status || 'call_no_answer',
      content_private: contentPrivate,
      next_follow_date: nextFollowDate || null,
    });

    // 更新CRM状态
    await update('crm_opportunities', { status: 'following' }, 'id = ?', [crmOpportunityId]);

    res.json({
      code: 0,
      data: { id: followUp.id },
      message: '跟进记录已添加',
    });
  } catch (err) {
    console.error('Add follow-up error:', err);
    res.status(500).json({ code: 500, message: '添加跟进记录失败' });
  }
});

// 获取跟进记录列表
router.get('/:crmOpportunityId', authRequired, async (req, res) => {
  try {
    // 验证CRM商机归属
    const crm = await queryOne(
      'SELECT id FROM crm_opportunities WHERE id = ? AND user_id = ?',
      [req.params.crmOpportunityId, req.userId]
    );
    if (!crm) {
      return res.json({ code: 404, message: 'CRM商机不存在' });
    }

    const followUps = await query(
      'SELECT * FROM follow_ups WHERE crm_opportunity_id = ? ORDER BY created_at DESC',
      [req.params.crmOpportunityId]
    );

    res.json({ code: 0, data: followUps });
  } catch (err) {
    console.error('Get follow-ups error:', err);
    res.status(500).json({ code: 500, message: '获取跟进记录失败' });
  }
});

// 分享摘要
router.post('/share', authRequired, async (req, res) => {
  try {
    const { followUpId, opportunityId, status, summary } = req.body || {};

    if (!opportunityId || !status) {
      return res.json({ code: 400, message: '请完善共享信息' });
    }

    // 检查是否已购买
    const purchase = await queryOne(
      'SELECT id FROM orders WHERE user_id = ? AND opportunity_id = ? AND status = "paid"',
      [req.userId, opportunityId]
    );
    if (!purchase) {
      return res.json({ code: 400, message: '只有购买者才能分享摘要' });
    }

    // 检查用户等级，决定是否免审
    const freeAudit = await isFreeAudit(req.userId);

    const share = await insert('follow_up_shares', {
      user_id: req.userId,
      opportunity_id: opportunityId,
      follow_up_id: followUpId || null,
      status,
      summary: summary || '',
      audit_status: freeAudit ? 'approved' : 'pending',
      is_anonymous: 1,
    });

    // 如果免审通过，给奖励积分
    if (freeAudit) {
      const [rewardConfig] = await query(
        "SELECT config_value FROM system_configs WHERE config_key = 'share_reward_points'"
      );
      const rewardPoints = parseInt(rewardConfig[0]?.config_value || '2');

      if (rewardPoints > 0) {
        await transaction(async (conn) => {
          await conn.execute(
            'UPDATE points_accounts SET balance = balance + ? WHERE user_id = ?',
            [rewardPoints, req.userId]
          );
          const [account] = await conn.execute(
            'SELECT balance FROM points_accounts WHERE user_id = ?',
            [req.userId]
          );
          await conn.execute(
            `INSERT INTO points_logs (user_id, delta, balance_after, source_type, source_title)
             VALUES (?, ?, ?, 'reward', '分享摘要奖励')`,
            [req.userId, rewardPoints, account[0].balance]
          );
        });
      }
    }

    res.json({
      code: 0,
      data: { id: share.id, auditStatus: share.audit_status },
      message: freeAudit ? '分享成功' : '分享成功，等待审核',
    });
  } catch (err) {
    console.error('Share follow-up error:', err);
    res.status(500).json({ code: 500, message: '分享失败' });
  }
});

// 标记有用（防作弊：必须购买同条商机，且不能给自己标记）
router.post('/helpful', authRequired, async (req, res) => {
  try {
    const { shareId } = req.body || {};

    if (!shareId) {
      return res.json({ code: 400, message: '参数错误' });
    }

    // 获取分享者及对应商机
    const share = await queryOne(
      'SELECT user_id, opportunity_id FROM follow_up_shares WHERE id = ? AND audit_status = "approved"',
      [shareId]
    );
    if (!share) {
      return res.json({ code: 404, message: '摘要不存在或未审核通过' });
    }

    // 不能给自己标记有用
    if (share.user_id === req.userId) {
      return res.json({ code: 403, message: '不能给自己的摘要标记有用' });
    }

    // 标记者必须购买过同一条商机
    const purchase = await queryOne(
      'SELECT id FROM orders WHERE user_id = ? AND opportunity_id = ? AND status = "paid"',
      [req.userId, share.opportunity_id]
    );
    if (!purchase) {
      return res.json({ code: 403, message: '只有购买同条商机的用户才能标记有用' });
    }

    // 检查是否已标记
    const existing = await queryOne(
      'SELECT id FROM follow_up_helpful_marks WHERE share_id = ? AND user_id = ?',
      [shareId, req.userId]
    );
    if (existing) {
      return res.json({ code: 409, message: '你已经标记过了' });
    }

    await transaction(async (conn) => {
      // 插入标记
      await conn.execute(
        'INSERT INTO follow_up_helpful_marks (share_id, user_id) VALUES (?, ?)',
        [shareId, req.userId]
      );

      // 更新有用计数
      await conn.execute(
        'UPDATE follow_up_shares SET helpful_count = helpful_count + 1 WHERE id = ?',
        [shareId]
      );

      // 给分享者奖励积分
      const [rewardConfig] = await conn.execute(
        "SELECT config_value FROM system_configs WHERE config_key = 'helpful_reward_points'"
      );
      const rewardPoints = parseInt(rewardConfig[0]?.config_value || '1');

      if (rewardPoints > 0) {
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
           VALUES (?, ?, ?, 'reward', '摘要被标记有用')`,
          [share.user_id, rewardPoints, account[0].balance]
        );
      }
    });

    res.json({ code: 0, message: '标记成功' });
  } catch (err) {
    console.error('Mark helpful error:', err);
    res.status(500).json({ code: 500, message: '标记失败' });
  }
});

export default router;
