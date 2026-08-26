/**
 * 后台角色权限中间件：校验 admin token 中携带的角色是否命中任一所要求的角色。
 * 必须挂在 adminAuthRequired 之后（依赖 req.adminRoles）。
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    const userRoles = req.adminRoles || [];
    if (!roles.some((r) => userRoles.includes(r))) {
      return res.status(403).json({ code: 403, message: '权限不足' });
    }
    next();
  };
}