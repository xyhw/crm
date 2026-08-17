import { Router } from 'express';
import { authRequired } from '../auth.js';
import { query, queryOne } from '../db.js';

const router = Router();

const SOURCE_TYPE_LABELS = {
  invalid_mark: '商机被判无效',
  share_report: '分享被举报',
  account_report: '账号被举报',
  purchase: '购买商机',
  share_helpful: '分享被认可',
  weekly_active: '活跃奖励',
  admin_adjust: '管理员调整',
};

// 获取当前用户信用分及变动记录
router.get('/', authRequired, async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    const user = await queryOne('SELECT credit_score FROM users WHERE id = ?', [req.userId]);
    const logs = await query(
      'SELECT * FROM user_credits WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?',
      [req.userId, Number(pageSize), offset]
    );
    const [countResult] = await query('SELECT COUNT(*) as total FROM user_credits WHERE user_id = ?', [req.userId]);

    res.json({
      code: 0,
      data: {
        creditScore: user?.credit_score ?? 100,
        list: logs.map((log) => ({
          id: log.id,
          changeAmount: log.change_amount,
          reason: log.change_reason,
          sourceType: log.source_type,
          sourceTypeLabel: SOURCE_TYPE_LABELS[log.source_type] || log.source_type,
          creditScore: log.credit_score,
          createdAt: log.created_at,
        })),
        total: countResult.total,
        page: Number(page),
        pageSize: Number(pageSize),
      },
    });
  } catch (error) {
    console.error('[Credits]', error.message);
    res.status(500).json({ code: 500, message: '获取信用记录失败' });
  }
});

export default router;
