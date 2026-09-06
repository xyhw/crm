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
    const { name, purchaseDiscount, sellerCommissionRate, purchaseRateThreshold, invalidRateThreshold, helpfulRateThreshold, activityThreshold, freeAudit, markWeight } = pickBodyFields(req.body, [
      'name', 'purchaseDiscount', 'sellerCommissionRate', 'purchaseRateThreshold', 'invalidRateThreshold',
      'helpfulRateThreshold', 'activityThreshold', 'freeAudit', 'markWeight',
    ]);

    const updates = {};
    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return res.json({ code: 400, message: '等级名称不能为空' });
      }
      updates.name = trimmed;
    }
    if (purchaseDiscount !== undefined) updates.purchase_discount = purchaseDiscount;
    if (sellerCommissionRate !== undefined) updates.seller_commission_rate = sellerCommissionRate;
    if (purchaseRateThreshold !== undefined) updates.purchase_rate_threshold = purchaseRateThreshold;
    if (invalidRateThreshold !== undefined) updates.invalid_rate_threshold = invalidRateThreshold;
    if (helpfulRateThreshold !== undefined) updates.helpful_rate_threshold = helpfulRateThreshold;
    if (activityThreshold !== undefined) updates.activity_threshold = activityThreshold;
    if (freeAudit !== undefined) updates.free_audit = freeAudit;
    if (markWeight !== undefined) updates.mark_weight = markWeight;

    if (Object.keys(updates).length === 0) {
      return res.json({ code: 400, message: '没有需要更新的配置' });
    }

    // 防穿仓：本档折扣须 >= 本档分佣率，且不得低于任一其它档的分佣率
    if (updates.purchase_discount !== undefined || updates.seller_commission_rate !== undefined) {
      const current = await queryOne('SELECT purchase_discount, seller_commission_rate FROM member_levels WHERE id = ?', [req.params.id]);
      if (!current) {
        return res.json({ code: 404, message: '等级不存在' });
      }
      const mergedDiscount = Number(updates.purchase_discount ?? current.purchase_discount);
      const mergedRate = Number(updates.seller_commission_rate ?? current.seller_commission_rate);
      const maxOtherRate = await queryOne(
        'SELECT MAX(seller_commission_rate) AS max_rate FROM member_levels WHERE id <> ?',
        [req.params.id]
      );
      const otherRate = Number(maxOtherRate?.max_rate || 0);
      if (mergedRate <= 0 || mergedRate > 1 || mergedDiscount <= 0 || mergedDiscount > 1) {
        return res.json({ code: 400, message: '折扣与分佣率须在 (0, 1] 区间' });
      }
      if (mergedDiscount < mergedRate || mergedDiscount < otherRate) {
        return res.json({ code: 400, message: `折扣（${mergedDiscount}）不得低于任一等级的分佣率（本档 ${mergedRate} / 其它档最高 ${otherRate}），否则分佣池穿仓` });
      }
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
