import { Router } from 'express';
import { getAdapter, settleRechargeOrder } from '../services/payment/index.js';

/**
 * Waffo Pancake 支付回调（托管收银台 -> 服务端回调）。
 * 注意：必须挂在 express.json() 之前，并使用 express.raw() 保留原始 body，
 *       验签依赖原始字节，被 JSON 解析后会失败。
 */
const router = Router();

router.post('/', async (req, res) => {
  const adapter = getAdapter('waffo');
  const rawBody = req.body; // Buffer（express.raw）
  const headers = req.headers;

  try {
    const verified = await adapter.verifyNotify(headers, rawBody);
    if (!verified) {
      return res.status(401).send('Invalid signature');
    }

    // 先应答 200，业务结算异步执行（幂等由 settleRechargeOrder 保证）
    res.status(200).send('OK');

    setImmediate(async () => {
      try {
        const result = await adapter.parseNotifyResult(headers, rawBody);
        if (!result.orderNo) {
          console.warn('[waffo] webhook missing orderNo, raw=', JSON.stringify(result.raw).slice(0, 300));
          return;
        }
        await settleRechargeOrder(result.orderNo, {
          payChannelOrderNo: result.payChannelOrderNo,
          paidAt: result.paidAt,
          rawNotify: result.raw,
        });
        console.log(`[waffo] order ${result.orderNo} settled`);
      } catch (err) {
        console.error('[waffo] webhook settle error:', err.message);
      }
    });
  } catch (err) {
    console.error('[waffo] webhook verify error:', err.message);
    res.status(500).send('Error');
  }
});

export default router;
