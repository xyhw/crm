/**
 * 请求体字段命名归一化
 *
 * 背景：后台写接口（Banner / 公告 / 分类 / 标签）历史上只读 camelCase 字段，
 * 而小程序后台页与独立 PC 后台都按数据库列名发 snake_case，导致
 * Banner 创建直接 400、分类与标签的 sort_order 被静默丢弃。
 *
 * 这里让写接口同时接受两种命名，避免前端各自拼字段名再次踩坑。
 */

/**
 * 把 camelCase 键名转成 snake_case
 * @param {string} key
 * @returns {string}
 */
export function toSnakeCase(key) {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

/**
 * 读取请求体字段，camelCase 优先，回退到等价的 snake_case
 * @param {object} body 请求体
 * @param {string} camelKey camelCase 字段名
 * @returns {*} 命中的字段值；两种命名都不存在时返回 undefined
 */
export function bodyField(body, camelKey) {
  if (!body || typeof body !== 'object') return undefined;
  if (body[camelKey] !== undefined) return body[camelKey];
  const snakeKey = toSnakeCase(camelKey);
  if (snakeKey !== camelKey && body[snakeKey] !== undefined) return body[snakeKey];
  return undefined;
}

/**
 * 批量读取请求体字段，返回以 camelCase 为键的对象
 * @param {object} body 请求体
 * @param {string[]} camelKeys 需要读取的 camelCase 字段名列表
 * @returns {object} 只包含命中字段的对象，未命中的键不会出现
 */
export function pickBodyFields(body, camelKeys) {
  const picked = {};
  for (const key of camelKeys) {
    const value = bodyField(body, key);
    if (value !== undefined) picked[key] = value;
  }
  return picked;
}
