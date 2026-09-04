import crypto from 'crypto';

/**
 * 个人主体小程序虚拟支付签名与 XML 解析。
 * 官方算法：paySig = HMAC-SHA256(appKey, uri + '&' + postBody)
 *           signature = HMAC-SHA256(sessionKey, signData)
 * postBody 必须与实际发出的原始字符串完全一致（不格式化、不改键顺序）。
 */

export function calcPaySig(uri, postBody, appKey) {
  const msg = `${uri}&${postBody}`;
  return crypto.createHmac('sha256', String(appKey)).update(msg, 'utf8').digest('hex');
}

export function calcUserSignature(signData, sessionKey) {
  return crypto.createHmac('sha256', String(sessionKey)).update(String(signData), 'utf8').digest('hex');
}

/** 稳定序列化：按给定键顺序输出紧凑 JSON，避免键顺序变化导致验签失败 */
export function stableStringify(obj, keys) {
  const ordered = {};
  for (const k of keys) {
    if (obj[k] !== undefined) ordered[k] = obj[k];
  }
  return JSON.stringify(ordered);
}

export function parseProductMap(raw) {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const map = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v) map[String(k)] = String(v);
    }
    return map;
  }
  try {
    const parsed = JSON.parse(String(raw));
    return parseProductMap(parsed);
  } catch {
    return {};
  }
}

/**
 * 按充值积分数匹配道具 ID。
 * productMap 形如 {"50":"prod_50","100":"prod_100"}，键为积分数。
 */
export function resolveProductId(amount, productMap) {
  const id = productMap?.[String(amount)];
  if (!id) {
    const err = new Error(`未配置 ${amount} 积分对应的虚拟支付道具，请在 MP 后台创建道具并填写 pay_wechat_product_map`);
    err.code = 400;
    throw err;
  }
  return id;
}

export function xmlCdata(xml, tag) {
  if (!xml) return '';
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i');
  const m = String(xml).match(re);
  if (!m) return '';
  const inner = m[1];
  const cdata = inner.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return (cdata ? cdata[1] : inner).trim();
}

export function parseDeliverNotifyXml(xml) {
  const raw = typeof xml === 'string' ? xml : Buffer.isBuffer(xml) ? xml.toString('utf8') : '';
  const event = xmlCdata(raw, 'Event');
  const openId = xmlCdata(raw, 'OpenId') || xmlCdata(raw, 'FromUserName');
  const outTradeNo = xmlCdata(raw, 'OutTradeNo');
  const wxOrderId = xmlCdata(raw, 'MchOrderNo') || xmlCdata(raw, 'WxOrderId');
  const productId = xmlCdata(raw, 'ProductId');
  const quantity = Number(xmlCdata(raw, 'Quantity') || '1') || 1;
  const attach = xmlCdata(raw, 'Attach') || xmlCdata(raw, 'attach');
  return { event, openId, outTradeNo, wxOrderId, productId, quantity, attach, raw };
}

/** MP 消息推送 URL 验证：sha1(sort(token, timestamp, nonce).join('')) */
export function verifyMpPushSignature(token, timestamp, nonce, signature) {
  if (!token || !signature) return false;
  const arr = [String(token), String(timestamp || ''), String(nonce || '')].sort();
  const digest = crypto.createHash('sha1').update(arr.join('')).digest('hex');
  return digest === String(signature).toLowerCase();
}

export function deliverNotifyOkXml() {
  return '<xml><ErrCode>0</ErrCode><ErrMsg><![CDATA[success]]></ErrMsg></xml>';
}

export function deliverNotifyFailXml(msg = 'fail') {
  const safe = String(msg).slice(0, 80);
  return `<xml><ErrCode>-1</ErrCode><ErrMsg><![CDATA[${safe}]]></ErrMsg></xml>`;
}
