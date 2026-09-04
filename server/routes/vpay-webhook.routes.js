import { Router } from 'express';
import { getAdapter, settleRechargeOrder } from '../services/payment/index.js';
import { verifyMpPushSignature, deliverNotifyFailXml } from '../services/payment/vpay-sign.js';
import { config } from '../config.js';

/**
 * 个人主体虚拟支付发货推送。
 * 必须挂在 express.json() 之前，使用 express.raw 保留 XML 原文。
 * GET：MP 后台配置 URL 时的 echostr 验证。
 * POST：xpay_goods_deliver_notify，验签后幂等入账。
 */
const router = Router();

router.get('/', (req, res) => {
  const { signature, timestamp, nonce, echostr } = req.query || {};
  const token = config.payment.wechat.pushToken;
  if (token && !verifyMpPushSignature(token, timestamp, nonce, signature)) {
    return res.status(403).send('invalid signature');
  }
  res.type('text/plain').send(echostr || 'ok');
});

router.post('/', async (req, res) => {
  const adapter = getAdapter('wechat');
  const rawBody = req.body;
  const headers = {
    ...req.headers,
    signature: req.query?.signature || req.headers.signature,
    timestamp: req.query?.timestamp || req.headers.timestamp,
    nonce: req.query?.nonce || req.headers.nonce,
    msg_signature: req.query?.msg_signature || req.headers.msg_signature,
  };

  res.type('application/xml');
  try {
    const verified = await adapter.verifyNotify(headers, rawBody);
    if (!verified) {
      return res.status(400).send(deliverNotifyFailXml('invalid signature'));
    }
    const result = await adapter.parseNotifyResult(headers, rawBody);
    if (!result.orderNo) {
      return res.status(400).send(deliverNotifyFailXml('missing order'));
    }
    await settleRechargeOrder(result.orderNo, {
      payChannelOrderNo: result.payChannelOrderNo,
      paidAt: result.paidAt,
      rawNotify: result.raw,
    });
    res.send(adapter.buildNotifyResponse());
  } catch (err) {
    console.error('[vpay] deliver notify error:', err.message);
    if (err.code === 404) {
      return res.status(404).send(deliverNotifyFailXml('order not found'));
    }
    res.status(500).send(deliverNotifyFailXml(err.message || 'fail'));
  }
});

export default router;
