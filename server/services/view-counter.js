/**
 * 浏览量去重：同一用户/IP 对同一商机在 TTL 内只计 1 次，防止刷浏览量。
 * 内存实现（单实例准确；多实例部署时各实例独立去重，属可接受的近似语义）。
 */
const TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 10000;

const seen = new Map(); // key -> lastCountedTs

export function shouldCountView(actorKey, opportunityId) {
  const key = `${actorKey}:${opportunityId}`;
  const now = Date.now();
  const last = seen.get(key);
  if (last && now - last < TTL_MS) return false;

  seen.set(key, now);
  if (seen.size > MAX_ENTRIES) {
    // 惰性清理过期项；清理后仍超限则丢弃最旧的一半，保证内存有界
    for (const [k, ts] of seen) {
      if (now - ts >= TTL_MS) seen.delete(k);
    }
    if (seen.size > MAX_ENTRIES) {
      const entries = [...seen.entries()].sort((a, b) => a[1] - b[1]);
      for (let i = 0; i < Math.floor(MAX_ENTRIES / 2); i++) seen.delete(entries[i][0]);
    }
  }
  return true;
}
