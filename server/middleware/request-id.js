import crypto from 'crypto';

/**
 * 请求 ID 中间件：优先复用上游 X-Request-Id（nginx/CLB），否则生成。
 * 响应头回写 X-Request-Id，错误日志携带同 ID 便于排障关联。
 */
export function requestId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  req.id = (typeof incoming === 'string' && incoming.trim()) || crypto.randomBytes(8).toString('hex');
  res.setHeader('X-Request-Id', req.id);
  next();
}
