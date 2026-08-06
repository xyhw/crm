import { query } from '../db.js';

export const analyticsLabels = {
  opportunities: { view: '查看跟单列表', edit: '修改跟单', delete: '删除跟单', invalid_mark: '标记无效' },
  users: { view: '查看用户列表', edit: '编辑用户', ban: '禁用用户', unban: '启用用户', adjust_points: '手动调整积分', adjust_credits: '手动调整信用分' },
  orders: { view: '查看订单列表', detail: '查看订单详情' },
  follow_up_shares: { approved: '审核通过', rejected: '审核驳回' },
  member_levels: { edit: '编辑等级配置' },
  system_configs: { edit: '编辑系统配置' },
  points: { view_logs: '查看积分流水' },
  role: { create: '创建角色', edit: '编辑角色', delete: '删除角色', assign_permission: '分配权限' },
  admin_user: { create: '创建管理员', edit: '编辑管理员', ban: '禁用管理员', assign_role: '分配角色' },
  opportunity: { import: '批量导入跟单', status_toggle: '切换上架状态' }
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

export function audit(targetType, action) {
  return (req, res, next) => {
    const originalSend = res.send;
    res.send = function (body) {
      let responseBody = body;
      try {
        responseBody = JSON.parse(body);
      } catch {}
      
      const isSuccess = responseBody?.code === 0;
      if (isSuccess && req.adminId) {
        const logAction = typeof action === 'function' ? action(req, res, responseBody) : action;
        const targetId = typeof targetId === 'function' ? targetId(req, res, responseBody) : (req.params?.id || req.body?.id || null);
        recordLog(req.adminId, logAction, targetType, targetId, null, req.ip);
      }
      
      res.send = originalSend;
      return originalSend.call(this, body);
    };
    next();
  };
}