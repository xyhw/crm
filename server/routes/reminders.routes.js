import { Router } from 'express';
import { authRequired } from '../auth.js';
import { query } from '../db.js';

const router = Router();

router.get('/', authRequired, async (req, res) => {
  try {
    const { type = 'today' } = req.query;

    let sql = `
      SELECT fu.*, co.id as crm_id, 
        opp.title as opportunity_title, opp.city, opp.hotel_name,
        fu.next_follow_date      FROM follow_ups fu
      JOIN crm_opportunities co ON fu.crm_opportunity_id = co.id
      LEFT JOIN opportunities opp ON co.opportunity_id = opp.id
      WHERE co.user_id = ?
    `;
    const params = [req.userId];

    if (type === 'today') {
      sql += ' AND DATE(fu.next_follow_date) = CURDATE()';
    } else if (type === 'overdue') {
      sql += ' AND fu.next_follow_date < CURDATE()';
    } else if (type === 'upcoming') {
      sql += ' AND fu.next_follow_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND fu.next_follow_date > CURDATE()';
    }

    sql += ' ORDER BY fu.next_follow_date ASC LIMIT 50';

    const reminders = await query(sql, params);

    // 聚合三个分类的提醒数量，供 tab 角标展示
    const [countRow] = await query(
      `SELECT
        SUM(DATE(fu.next_follow_date) = CURDATE()) as today,
        SUM(fu.next_follow_date < CURDATE()) as overdue,
        SUM(fu.next_follow_date > CURDATE()
          AND fu.next_follow_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)) as upcoming
       FROM follow_ups fu
       JOIN crm_opportunities co ON fu.crm_opportunity_id = co.id
       WHERE co.user_id = ?`,
      [req.userId]
    );

    res.json({
      code: 0,
      data: {
        list: reminders.map(r => ({
          id: r.id,
          crmOpportunityId: r.crm_id,
          opportunityTitle: r.opportunity_title || '',
          city: r.city || '',
          hotelName: r.hotel_name || '',
          status: r.status,
          nextFollowDate: r.next_follow_date,
          contentPrivate: r.content_private,
          createdAt: r.created_at,
        })),
        counts: {
          today: Number(countRow?.today || 0),
          overdue: Number(countRow?.overdue || 0),
          upcoming: Number(countRow?.upcoming || 0),
        },
      },
    });
  } catch (error) {
    console.error('[Reminders]', error.message);
    res.status(500).json({ code: 500, message: '获取提醒失败' });
  }
});

export default router;