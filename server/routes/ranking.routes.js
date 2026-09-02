import { Router } from 'express';
import { query } from '../db.js';
import { authRequired, optionalAuth } from '../auth.js';
import { setCache } from '../middleware/cache-headers.js';
import { anonymizeName } from '../constants.js';

const router = Router();

// 获取排行榜
router.get('/', optionalAuth, setCache(300, { staleWhileRevalidate: 600 }), async (req, res) => {
  try {
    const { type = 'publisher', period = 'week', page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let list = [];
    let total = 0;

    if (type === 'publisher') {
      // 达人榜：按投稿被购买量排序
      [list, [{ total }]] = await Promise.all([
        query(
          `SELECT u.id, u.nickname, u.avatar, COUNT(o.id) as purchase_count
           FROM users u
           JOIN opportunities opp ON u.id = opp.user_id
           JOIN orders o ON opp.id = o.opportunity_id AND o.status = 'paid'
           WHERE u.status = 'active' AND u.deleted_at IS NULL
           GROUP BY u.id
           ORDER BY purchase_count DESC
           LIMIT ? OFFSET ?`,
          [Number(pageSize), offset]
        ),
        query(
          `SELECT COUNT(DISTINCT u.id) as total
           FROM users u
           JOIN opportunities opp ON u.id = opp.user_id
           JOIN orders o ON opp.id = o.opportunity_id AND o.status = 'paid'
           WHERE u.status = 'active' AND u.deleted_at IS NULL`
        ),
      ]);
    } else if (type === 'contributor') {
      // 贡献榜：按进展被标记有用数排序
      [list, [{ total }]] = await Promise.all([
        query(
          `SELECT u.id, u.nickname, u.avatar, SUM(s.helpful_count) as helpful_count
           FROM users u
           JOIN follow_up_shares s ON u.id = s.user_id
           WHERE u.status = 'active' AND u.deleted_at IS NULL
           GROUP BY u.id
           ORDER BY helpful_count DESC
           LIMIT ? OFFSET ?`,
          [Number(pageSize), offset]
        ),
        query(
          `SELECT COUNT(DISTINCT u.id) as total
           FROM users u
           JOIN follow_up_shares s ON u.id = s.user_id
           WHERE u.status = 'active' AND u.deleted_at IS NULL`
        ),
      ]);
    }

    // 检查当前用户是否在排行榜中
    let currentUserRank = null;
    if (req.userId) {
      if (type === 'publisher') {
        const [rank] = await query(
          `SELECT COUNT(*) + 1 as rank FROM (
             SELECT u.id, COUNT(o.id) as purchase_count
             FROM users u
             JOIN opportunities opp ON u.id = opp.user_id
             JOIN orders o ON opp.id = o.opportunity_id AND o.status = 'paid'
             WHERE u.status = 'active' AND u.deleted_at IS NULL
             GROUP BY u.id
           ) t
           WHERE t.purchase_count > (
             SELECT COUNT(*) FROM orders o2
             JOIN opportunities opp2 ON o2.opportunity_id = opp2.id
             WHERE opp2.user_id = ? AND o2.status = 'paid'
           )`,
          [req.userId]
        );
        currentUserRank = rank?.rank;
      }
    }

    res.json({
      code: 0,
      data: {
        list: list.map((item, index) => ({
          rank: offset + index + 1,
          ...item,
          nickname: anonymizeName(item.nickname),
        })),
        total: Number(total) || 0,
        currentUserRank,
        type,
        period,
      },
    });
  } catch (err) {
    console.error('Get ranking error:', err);
    res.status(500).json({ code: 500, message: '获取排行榜失败' });
  }
});

export default router;
