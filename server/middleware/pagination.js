/**
 * 全局分页参数钳制：page/pageSize 非法或缺省时回退默认值，上限 500
 * 防止 pageSize 超大值拖库（列表 SQL 均以本中间件产出的值为准）。
 * 上限取 500 以兼容既有调用方与测试（core.test.js recommend 场景使用 pageSize=500）。
 */
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 500;
const MAX_PAGE = 10_000;

function toClampedInt(raw, fallback, max) {
  const n = parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1) return String(fallback);
  return String(Math.min(n, max));
}

export function paginationLimiter(req, res, next) {
  const q = req.query;
  if (q.page !== undefined) {
    q.page = toClampedInt(q.page, DEFAULT_PAGE, MAX_PAGE);
  }
  if (q.pageSize !== undefined) {
    q.pageSize = toClampedInt(q.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  }
  next();
}
