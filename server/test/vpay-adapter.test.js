import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { config } from '../config.js';
import { WechatAdapter } from '../services/payment/wechat.js';
import { calcPaySig, calcUserSignature } from '../services/payment/vpay-sign.js';

describe('WechatAdapter 虚拟支付下单', () => {
  before(() => {
    Object.assign(config.payment.wechat, {
      appId: 'wx-test-app',
      offerId: '123456789',
      appKey: 'test-app-key',
      productMap: '{"100":"prod_100","50":"prod_50"}',
      env: 0,
      pushToken: '',
    });
  });

  it('isConfigured 在 OfferID+AppKey+AppID 齐全时为 true', () => {
    const a = new WechatAdapter();
    assert.strictEqual(a.isConfigured(), true);
  });

  it('createPayment 返回 short_series_goods payData，签名可复核', async () => {
    const a = new WechatAdapter();
    const r = await a.createPayment({
      orderNo: 'R17100000001111',
      amount: 100,
      price: 10000,
      userId: 9,
      sessionKey: 'sess-abc',
      openid: 'oTEST',
    });
    assert.strictEqual(r.payMethod, 'virtual');
    assert.strictEqual(r.payData.mode, 'short_series_goods');
    const signObj = JSON.parse(r.payData.signData);
    assert.strictEqual(signObj.offerId, '123456789');
    assert.strictEqual(signObj.buyQuantity, 1);
    assert.strictEqual(signObj.env, 0);
    assert.strictEqual(signObj.currencyType, 'CNY');
    assert.strictEqual(signObj.productId, 'prod_100');
    assert.strictEqual(signObj.goodsPrice, 10000);
    assert.strictEqual(signObj.outTradeNo, 'R17100000001111');
    assert.strictEqual(r.payData.paySig, calcPaySig('requestVirtualPayment', r.payData.signData, 'test-app-key'));
    assert.strictEqual(r.payData.signature, calcUserSignature(r.payData.signData, 'sess-abc'));
  });

  it('未映射道具时拒绝下单', async () => {
    const a = new WechatAdapter();
    await assert.rejects(
      () => a.createPayment({
        orderNo: 'R2', amount: 999, price: 99900, userId: 1, sessionKey: 's', openid: 'o',
      }),
      /未配置 999 积分/
    );
  });

  it('parseNotifyResult 以 OutTradeNo / MchOrderNo 作为幂等键', async () => {
    const a = new WechatAdapter();
    const xml = `<xml><Event><![CDATA[xpay_goods_deliver_notify]]></Event>
      <OutTradeNo><![CDATA[R17100000001111]]></OutTradeNo>
      <MchOrderNo><![CDATA[wx_oid_1]]></MchOrderNo></xml>`;
    const parsed = await a.parseNotifyResult({}, xml);
    assert.strictEqual(parsed.orderNo, 'R17100000001111');
    assert.strictEqual(parsed.payChannelOrderNo, 'wx_oid_1');
  });
});
