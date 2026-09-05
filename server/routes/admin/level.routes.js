import { Router } from 'express';
import { query, queryOne, update } from '../../db.js';
import { clearLevelConfigCache } from '../../services/level.service.js';
import { recordLog } from '../../services/audit-log.service.js';
import { pickBodyFields } from '../../utils/body-fields.js';

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
    const { purchaseDiscount, commissionBonus, purchaseRateThreshold, invalidRateThreshold, helpfulRateThreshold, activityThreshold, freeAudit, markWeight } = pickBodyFields(req.body, [
      'purchaseDiscount', 'commissionBonus', 'purchaseRateThreshold', 'invalidRateThreshold',
      'helpfulRateThreshold', 'activityThreshold', 'freeAudit', 'markWeight',
    ]);

    const updates = {};
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
