/**
 * 轻量结构化日志器（零依赖，JSON lines 输出到 stdout/stderr，Docker 友好）。
 *
 * 设计为 console.* 的直接替代：logger.info/error/warn 接受任意参数，
 * Error 对象序列化为 { message, stack }，普通对象合并为字段，其余拼接为 msg。
 * 后续如需 pino，仅需替换本模块内部实现（调用签名兼容）。
 *
 * LOG_LEVEL=debug|info|warn|error 控制最低输出级别，默认 info。
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL = LEVELS[String(process.env.LOG_LEVEL || '').toLowerCase()] ?? LEVELS.info;

function serializeError(err) {
  return { message: err.message, ...(err.stack ? { stack: err.stack } : {}) };
}

function emit(level, args) {
  if (LEVELS[level] < MIN_LEVEL) return;
  let msg = '';
  const meta = {};
  for (const a of args) {
    if (a instanceof Error) {
      meta.err = serializeError(a);
    } else if (typeof a === 'object' && a !== null) {
      Object.assign(meta, a);
    } else if (a !== undefined) {
      msg += (msg ? ' ' : '') + String(a);
    }
  }
  const entry = { ts: new Date().toISOString(), level, msg, ...meta };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (...args) => emit('debug', args),
  info: (...args) => emit('info', args),
  /** console.log 的兼容别名 */
  log: (...args) => emit('info', args),
  warn: (...args) => emit('warn', args),
  error: (...args) => emit('error', args),
};

export default logger;
