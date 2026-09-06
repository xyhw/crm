/**
 * 统一响应约定（与 .monkeycode/docs/INTERFACES.md 及两套前端 request 层对齐）：
 * - 业务结果一律 HTTP 200 + body.code（0 成功，非 0 为业务错误码）
 * - HTTP 4xx/5xx 仅保留给鉴权中间件与 webhook 验签等基础设施场景
 *
 * 新增/重构的路由一律使用 ok/fail；asyncHandler 包装异步路由，
 * 异常交给全局错误中间件（结构化日志 + 固定 500，不外泄内部信息）。
 */

export function ok(res, data = null, message = '') {
  const body = { code: 0 };
  if (message) body.message = message;
  body.data = data === undefined ? null : data;
  return res.json(body);
}

export function fail(res, code, message, { httpStatus } = {}) {
  if (httpStatus) res.status(httpStatus);
  return res.json({ code, message });
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
