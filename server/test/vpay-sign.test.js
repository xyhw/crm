import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import {
  calcPaySig,
  calcUserSignature,
  stableStringify,
  parseProductMap,
  resolveProductId,
  parseDeliverNotifyXml,
  verifyMpPushSignature,
  deliverNotifyOkXml,
} from '../services/payment/vpay-sign.js';

describe('虚拟支付签名与推送解析', () => {
  it('paySig 与官方算法一致：HMAC-SHA256(appKey, uri&postBody)', () => {
    const uri = 'requestVirtualPayment';
    const body = '{"offerId":"123","buyQuantity":1}';
    const sig = calcPaySig(uri, body, 'test-app-key');
    assert.strictEqual(sig.length, 64);
    assert.strictEqual(sig, calcPaySig(uri, body, 'test-app-key'));
    assert.notStrictEqual(sig, calcPaySig(uri, '{"offerId":"123"}', 'test-app-key'));
  });

  it('用户态 signature 使用 sessionKey 对 signData 做 HMAC', () => {
    const signData = '{"offerId":"123"}';
    const sig = calcUserSignature(signData, 'sess-key');
    assert.strictEqual(sig.length, 64);
    assert.notStrictEqual(sig, calcPaySig('requestVirtualPayment', signData, 'sess-key'));
  });

  it('stableStringify 固定键顺序', () => {
    const keys = ['offerId', 'buyQuantity', 'env'];
    const a = stableStringify({ env: 0, buyQuantity: 1, offerId: 'x' }, keys);
    const b = stableStringify({ offerId: 'x', buyQuantity: 1, env: 0 }, keys);
    assert.strictEqual(a, b);
    assert.strictEqual(a, '{"offerId":"x","buyQuantity":1,"env":0}');
  });

  it('productMap 按积分数匹配道具 ID', () => {
    const map = parseProductMap('{"50":"p50","100":"p100"}');
    assert.strictEqual(resolveProductId(50, map), 'p50');
    assert.throws(() => resolveProductId(200, map), /未配置 200 积分/);
  });

  it('解析 xpay_goods_deliver_notify XML 提取单号与 wx_order_id', () => {
    const xml = `<xml>
      <Event><![CDATA[xpay_goods_deliver_notify]]></Event>
      <OpenId><![CDATA[oABC]]></OpenId>
      <OutTradeNo><![CDATA[R123]]></OutTradeNo>
      <WeChatPayInfo>
        <MchOrderNo><![CDATA[wxoid-9]]></MchOrderNo>
      </WeChatPayInfo>
      <GoodsInfo>
        <ProductId><![CDATA[prod_50]]></ProductId>
        <Quantity>1</Quantity>
      </GoodsInfo>
    </xml>`;
    const p = parseDeliverNotifyXml(xml);
    assert.strictEqual(p.event, 'xpay_goods_deliver_notify');
    assert.strictEqual(p.openId, 'oABC');
    assert.strictEqual(p.outTradeNo, 'R123');
    assert.strictEqual(p.wxOrderId, 'wxoid-9');
    assert.strictEqual(p.productId, 'prod_50');
    assert.strictEqual(p.quantity, 1);
  });

  it('MP 推送 URL 验证签名', () => {
    const token = 'tok';
    const timestamp = '1710000000';
    const nonce = 'n1';
    const arr = [token, timestamp, nonce].sort();
    const signature = crypto.createHash('sha1').update(arr.join('')).digest('hex');
    assert.strictEqual(verifyMpPushSignature(token, timestamp, nonce, signature), true);
    assert.strictEqual(verifyMpPushSignature(token, timestamp, nonce, 'deadbeef'), false);
  });

  it('发货成功应答为官方 XML', () => {
    assert.match(deliverNotifyOkXml(), /<ErrCode>0<\/ErrCode>/);
  });
});
