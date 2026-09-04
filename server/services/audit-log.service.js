import { query } from '../db.js';

export const analyticsLabels = {
  opportunities: { view: '查看商机列表', edit: '修改商机', delete: '删除商机', invalid_mark: '标记无效' },
  users: { view: '查看用户列表', edit: '编辑用户', ban: '禁用用户', unban: '启用用户', adjust_points: '手动调整积分', adjust_credits: '手动调整信用分' },
  orders: { view: '查看订单列表', detail: '查看订单详情' },
  follow_up_shares: { approved: '审核通过', rejected: '审核驳回' },
  member_levels: { edit: '编辑等级配置' },
  system_configs: { edit: '编辑系统配置' },
  points: { view_logs: '查看积分流水' },
  role: { create: '创建角色', edit: '编辑角色', delete: '删除角色', assign_permission: '分配权限' },
  admin_user: { create: '创建管理员', edit: '编辑管理员', ban: '禁用管理员', assign_role: '分配角色' },
  opportunity: { import: '批量导入商机', status_toggle: '切换上架状态' },
  banner: { create: '创建Banner', edit: '编辑Banner', delete: '删除Banner' },
  announcement: { create: '创建公告', edit: '编辑公告', delete: '删除公告' },
  category: { create: '创建分类', edit: '编辑分类', delete: '删除分类' },
  tag: { create: '创建标签', edit: '编辑标签', delete: '删除标签' },
  order: { adjust: '订单调整' },
  payment_order: { recharge_sync: '充值查单补账', recharge_refund: '充值退款登记' },
};

export async function recordLog(adminId, action, targetType, targetId, detail = null, ip = null) {
  try {
    await query(
      'INSERT INTO operation_logs (admin_id, action, target_type, target_id, detail, ip) VALUES (?, ?, ?, ?, ?, ?)',
      [adminId, action, targetType, targetId, JSON.stringify(detail || {}), ip]
    );
  } catch (error) {
    console.error('[AuditLog] Write failed:', error.message);
  }
}

export function audit(targetType, action, targetIdResolver) {
  return (req, res, next) => {
    const originalSend = res.send;
    res.send = function (body) {
      let responseBody = body;
      try {
        responseBody = JSON.parse(body);
      } catch {}

      if (responseBody?.code === 0 && req.adminId) {
        const logAction = typeof action === 'function' ? action(req, res, responseBody) : action;
        const targetId = typeof targetIdResolver === 'function'
          ? targetIdResolver(req, res, responseBody)
          : (req.params?.id || req.body?.id || null);
        recordLog(req.adminId, logAction, targetType, targetId, null, req.ip);
      }

      res.send = originalSend;
      return originalSend.call(this, body);
    };
    next();
  };
}