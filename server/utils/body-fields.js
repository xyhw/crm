/**
 * 请求体字段命名归一化
 *
 * 后台写接口同时接受 camelCase 与 snake_case，避免 miniapp / PC 后台各自拼字段名踩坑。
 */

export function toSnakeCase(key) {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

export function bodyField(body, camelKey) {
  if (!body || typeof body !== 'object') return undefined;
  if (body[camelKey] !== undefined) return body[camelKey];
  const snakeKey = toSnakeCase(camelKey);
  if (snakeKey !== camelKey && body[snakeKey] !== undefined) return body[snakeKey];
  return undefined;
}

export function pickBodyFields(body, camelKeys) {
  const picked = {};
  for (const key of camelKeys) {
    const value = bodyField(body, key);
    if (value !== undefined) picked[key] = value;
  }
  return picked;
}
