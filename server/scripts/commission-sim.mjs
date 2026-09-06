/**
 * 分佣测算脚本（方案 B：定价制，与 server/services/level.service.js 公式同源）
 * 运行：node --env-file-if-exists=.env scripts/commission-sim.mjs
 * 从现库读取 member_levels 两档参数，输出定价-买家等级-卖家等级全矩阵，
 * 并用真实 calculateSellerEarnings / getPurchasePrice 校验。
 */
import { query, closePool } from '../db.js';
import { calculateSellerEarnings, getPurchasePrice } from '../services/level.service.js';

const levels = await query('SELECT level_key, name, purchase_discount, seller_commission_rate FROM member_levels ORDER BY sort_order');

const R = (x) => Math.round(x);

// 方案 B 订单链路公式：买家实付 = R(定价 × 买家折扣)；卖家到手 = R(定价 × 卖家分佣率)
function sim(listPrice, buyer, seller) {
  const finalPrice = R(listPrice * buyer.purchase_discount);
  const sellerEarnings = R(listPrice * seller.seller_commission_rate);
  return { finalPrice, sellerEarnings, platformFee: finalPrice - sellerEarnings };
}

// 穿仓守卫：最低折扣 >= 最高分佣率
const minDisc = Math.min(...levels.map((l) => Number(l.purchase_discount)));
const maxRate = Math.max(...levels.map((l) => Number(l.seller_commission_rate)));
console.log(`等级两档｜穿仓守卫：最低折扣 ${minDisc} ${minDisc >= maxRate ? '>=' : '<'} 最高分佣率 ${maxRate}${minDisc >= maxRate ? '（安全）' : '（穿仓风险！）'}`);

console.log('\n等级参数：');
for (const l of levels) {
  console.log(`  ${l.name.padEnd(5)} 买家折扣 ${(l.purchase_discount * 100).toFixed(0)}%  卖家分佣率 ${(l.seller_commission_rate * 100).toFixed(0)}%`);
}

console.log('\n===== 矩阵：定价 100 积分 =====');
console.log('买家等级 | 实付 | 卖家等级 | 卖家到手 | 平台留存（含池）');
for (const b of levels) {
  for (const s of levels) {
    const r = sim(100, b, s);
    console.log(`${b.name} | ${r.finalPrice} | ${s.name} | ${r.sellerEarnings} | ${r.platformFee}`);
  }
}

console.log('\n===== 常见定价速查 =====');
for (const price of [50, 100, 200]) {
  const normal = levels.find((l) => l.level_key === 'normal');
  const premium = levels.find((l) => l.level_key === 'premium');
  const r1 = sim(price, normal, normal);
  const r2 = sim(price, premium, premium);
  console.log(`定价${price}：普通买普通卖 → 付${r1.finalPrice} 卖家得${r1.sellerEarnings} 平台留存${r1.platformFee}｜高级买高级卖 → 付${r2.finalPrice} 卖家得${r2.sellerEarnings} 平台留存${r2.platformFee}`);
}

console.log('\n===== 卖家目标净收入反推定价（卖家=高级，买家=普通）=====');
{
  const premium = levels.find((l) => l.level_key === 'premium');
  const normal = levels.find((l) => l.level_key === 'normal');
  for (const target of [80, 100, 150]) {
    const rate = Number(premium.seller_commission_rate);
    const approxPrice = R(target / rate);
    const check = sim(approxPrice, normal, premium);
    console.log(`目标到手${target} → 建议定价约${approxPrice}（实算卖家得${check.sellerEarnings}，买家付${check.finalPrice}）`);
  }
}

console.log('\n===== 商机被判无效的回扣测算（invalid_penalty_rate=0.20，回扣 1.2 倍）=====');
{
  const penalty = await query("SELECT config_value FROM system_configs WHERE config_key = 'invalid_penalty_rate'");
  const p = Number(penalty[0]?.config_value || '0.20');
  const normal = levels.find((l) => l.level_key === 'normal');
  const r = sim(100, normal, normal);
  const paid = r.sellerEarnings;
  const clawback = R(paid * (1 + p));
  console.log(`一笔 100 定价订单：卖家曾得 ${paid}，判无效后扣回 ${clawback}（1 + ${p}）；买家退款 ${r.finalPrice}`);
}

console.log('\n===== 用真实服务函数校验（同库任意两个真实用户，定价 100）=====');
{
  const pair = await query(
    `SELECT a.id AS seller, b.id AS buyer FROM users a JOIN users b ON a.id <> b.id
     WHERE a.status='active' AND b.status='active' LIMIT 1`
  );
  if (pair[0]) {
    const actual = await calculateSellerEarnings(pair[0].seller, 100, 100);
    const price = await getPurchasePrice(1, pair[0].buyer).catch(() => null);
    console.log(`calculateSellerEarnings(seller=${pair[0].seller}, 定价100, 实付100) =`, JSON.stringify(actual));
    console.log('getPurchasePrice(opportunity#1) =', price ? JSON.stringify(price) : '无商机数据，跳过');
  } else {
    console.log('库中不足两个活跃用户，跳过');
  }
}

await closePool();
