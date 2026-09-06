/**
 * 列表查询构造器：list 与 count 共用同一组 WHERE 条件，消除「复制一份条件拼 count」
 * 双写漂移（历史 bug：count 漏掉 tag 等过滤条件导致分页总数不准）。
 *
 * conditions 项：
 *   - falsy            → 忽略
 *   - string           → 纯 SQL 片段（无参数）
 *   - [sql, params[]]  → 片段 + 参数
 */
export function buildWhere(conditions) {
  const frags = [];
  const params = [];
  for (const c of conditions) {
    if (!c) continue;
    if (typeof c === 'string') {
      frags.push(c);
      continue;
    }
    frags.push(c[0]);
    if (Array.isArray(c[1])) params.push(...c[1]);
    else params.push(c[1]);
  }
  return {
    whereSql: frags.length ? ` WHERE ${frags.join(' AND ')}` : '',
    params,
  };
}

/**
 * LIKE 关键词转义：转义 \ % _ 通配符，防止用户输入 % 匹配全表。
 * MySQL LIKE 默认以反斜杠为转义符，配合 wrapLike 使用。
 */
export function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export function wrapLike(value) {
  return `%${escapeLike(value)}%`;
}
