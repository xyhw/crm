import { Router } from 'express';
import { query, queryOne, update } from '../../db.js';
import { clearLevelConfigCache } from '../../services/level.service.js';
import { recordLog } from '../../services/audit-log.service.js';

const router = Router();

// 获取等级配置
router.get('/', async (req, res) => {
  try {
    const levels = await query('SELECT * FROM member_levels ORDER BY sort_order');
    res.json({ code: 0, data: levels });
  } catch (err) {
    console.error('Admin get levels error:', err);
    res.status(500).json({ code: 500, message: '获取等级配置失败' });
  }
});

// 更新等级配置
router.put('/:id', async (req, res) => {
  try {
    const { purchaseDiscount, commissionRate, commissionBonus, purchaseRateThreshold, invalidRateThreshold, helpfulRateThreshold, activityThreshold, freeAudit, markWeight } = req.body || {};

    const updates = {};
    // P0-2：分佣比例（直接比例，后台可配）；purchase_discount 已废弃（购买统一原价）仅兼容保留
    if (commissionRate !== undefined) {
      const rate = Number(commissionRate);
      if (!Number.isFinite(rate) || rate <= 0 || rate > 1) {
        return res.json({ code: 400, message: '分佣比例需为 0~1 之间的小数（如 0.75）' });
      }
      updates.commission_rate = rate;
    }
    if (purchaseDiscount !== undefined) updates.purchase_discount = purchaseDiscount;
    if (commissionBonus !== undefined) updates.commission_bonus = commissionBonus;
    if (purchaseRateThreshold !== undefined) updates.purchase_rate_threshold = purchaseRateThreshold;
    if (invalidRateThreshold !== undefined) updates.invalid_rate_threshold = invalidRateThreshold;
    if (helpfulRateThreshold !== undefined) updates.helpful_rate_threshold = helpfulRateThreshold;
    if (activityThreshold !== undefined) updates.activity_threshold = activityThreshold;
    if (freeAudit !== undefined) updates.free_audit = freeAudit;
    if (markWeight !== undefined) updates.mark_weight = markWeight;

    if (Object.keys(updates).length === 0) {
      return res.json({ code: 400, message: '没有需要更新的配置' });
    }

    await update('member_levels', updates, 'id = ?', [req.params.id]);
    clearLevelConfigCache();
    await recordLog(req.adminId, 'edit', 'member_levels', req.params.id, updates);
    res.json({ code: 0, message: '等级配置更新成功' });
  } catch (err) {
    console.error('Admin update level error:', err);
    res.status(500).json({ code: 500, message: '更新等级配置失败' });
  }
});

export default router;
