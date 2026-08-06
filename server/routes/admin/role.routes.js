import { Router } from 'express';
import { adminAuthRequired } from '../../auth.js';
import { query, queryOne, insert, update, del } from '../../db.js';
import { recordLog } from '../../services/audit-log.service.js';
import bcrypt from 'bcryptjs';

const router = Router();

const ALL_PERMISSIONS = [
  { key: 'dashboard', label: '仪表盘', group: '基础' },
  { key: 'opportunities', label: '跟单管理', group: '跟单' },
  { key: 'opportunities.edit', label: '编辑跟单', group: '跟单' },
  { key: 'opportunities.import', label: '批量导入跟单', group: '跟单' },
  { key: 'opportunities.status', label: '切换跟单状态', group: '跟单' },
  { key: 'users', label: '用户管理', group: '用户' },
  { key: 'users.edit', label: '编辑用户', group: '用户' },
  { key: 'users.ban', label: '封禁用户', group: '用户' },
  { key: 'users.points', label: '调整积分', group: '用户' },
  { key: 'users.credits', label: '调整信用分', group: '用户' },
  { key: 'orders', label: '订单管理', group: '订单' },
  { key: 'points', label: '积分管理', group: '积分' },
  { key: 'levels', label: '等级配置', group: '配置' },
  { key: 'levels.edit', label: '编辑等级', group: '配置' },
  { key: 'configs', label: '系统配置', group: '配置' },
  { key: 'configs.edit', label: '编辑系统配置', group: '配置' },
  { key: 'audit', label: '审核管理', group: '审核' },
  { key: 'audit.approve', label: '审核通过/驳回', group: '审核' },
  { key: 'audit_logs', label: '操作日志', group: '系统' },
  { key: 'roles', label: '角色管理', group: '系统' },
  { key: 'roles.edit', label: '编辑角色/分配权限', group: '系统' },
  { key: 'admins', label: '管理员管理', group: '系统' },
  { key: 'admins.edit', label: '创建/编辑管理员', group: '系统' },
];

// 权限点列表
router.get('/permissions', adminAuthRequired, async (req, res) => {
  res.json({ code: 0, data: ALL_PERMISSIONS });
});

// 角色列表
router.get('/', adminAuthRequired, async (req, res) => {
  try {
    const roles = await query('SELECT * FROM roles ORDER BY id');
    for (const role of roles) {
      const perms = await query('SELECT permission_key FROM role_permissions WHERE role_id = ?', [role.id]);
      role.permissions = perms.map(p => p.permission_key);
    }
    res.json({ code: 0, data: roles });
  } catch (e) {
    res.status(500).json({ code: 500, message: '获取角色列表失败' });
  }
});

// 创建角色
router.post('/', adminAuthRequired, async (req, res) => {
  try {
    const { name, description, permissions } = req.body || {};
    if (!name) return res.json({ code: 400, message: '请输入角色名称' });
    const existing = await queryOne('SELECT id FROM roles WHERE name = ?', [name]);
    if (existing) return res.json({ code: 409, message: '角色名称已存在' });

    const role = await insert('roles', { name, description: description || '' });
    if (permissions && Array.isArray(permissions)) {
      for (const permKey of permissions) {
        await insert('role_permissions', { role_id: role.id, permission_key: permKey });
      }
    }
    await recordLog(req.adminId, '创建角色', 'role', role.id, { name, permissions });
    res.json({ code: 0, data: role, message: '角色创建成功' });
  } catch (e) {
    res.status(500).json({ code: 500, message: '创建角色失败' });
  }
});

// 更新角色
router.put('/:id', adminAuthRequired, async (req, res) => {
  try {
    const { name, description, permissions } = req.body || {};
    const roleId = req.params.id;
    const role = await queryOne('SELECT * FROM roles WHERE id = ?', [roleId]);
    if (!role) return res.json({ code: 404, message: '角色不存在' });

    if (name) await update('roles', { name, description: description || '' }, 'id = ?', [roleId]);
    if (permissions && Array.isArray(permissions)) {
      await del('role_permissions', 'role_id = ?', [roleId]);
      for (const permKey of permissions) await insert('role_permissions', { role_id: roleId, permission_key: permKey });
    }
    await recordLog(req.adminId, '编辑权限', 'role', roleId, { name, permissions });
    res.json({ code: 0, message: '角色更新成功' });
  } catch (e) {
    res.status(500).json({ code: 500, message: '编辑角色失败' });
  }
});

// 删除角色
router.delete('/:id', adminAuthRequired, async (req, res) => {
  try {
    const roleId = req.params.id;
    const role = await queryOne('SELECT * FROM roles WHERE id = ?', [roleId]);
    if (!role) return res.json({ code: 404, message: '角色不存在' });
    const assigned = await query('SELECT admin_id FROM admin_role_relations WHERE role_id = ?', [roleId]);
    if (assigned.length > 0) return res.json({ code: 409, message: '该角色已分配给管理员，无法删除' });

    await del('role_permissions', 'role_id = ?', [roleId]);
    await del('roles', 'id = ?', [roleId]);
    await recordLog(req.adminId, '删除角色', 'role', roleId, { name: role.name });
    res.json({ code: 0, message: '角色已删除' });
  } catch (e) {
    res.status(500).json({ code: 500, message: '删除角色失败' });
  }
});

// 管理员列表
router.get('/admins', adminAuthRequired, async (req, res) => {
  try {
    const admins = await query('SELECT id, username, name, phone, status, created_at FROM admin_users ORDER BY id');
    for (const admin of admins) {
      const roles = await query('SELECT r.id, r.name FROM roles r JOIN admin_role_relations arr ON r.id = arr.role_id WHERE arr.admin_id = ?', [admin.id]);
      admin.roles = roles;
    }
    res.json({ code: 0, data: admins });
  } catch (e) {
    res.status(500).json({ code: 500, message: '获取管理员列表失败' });
  }
});

// 创建管理员
router.post('/admins', adminAuthRequired, async (req, res) => {
  try {
    const { username, password, name, phone, roleIds } = req.body || {};
    if (!username || !password || !name) return res.json({ code: 400, message: '请填写必填信息' });
    const existing = await queryOne('SELECT id FROM admin_users WHERE username = ?', [username]);
    if (existing) return res.json({ code: 409, message: '管理员用户名已存在' });

    const hash = await bcrypt.hash(password, 10);
    const admin = await insert('admin_users', { username, password_hash: hash, name, phone: phone || '', status: 'active' });
    if (roleIds && Array.isArray(roleIds)) {
      for (const roleId of roleIds) await insert('admin_role_relations', { admin_id: admin.id, role_id: roleId });
    }
    await recordLog(req.adminId, '创建管理员', 'admin_user', admin.id, { username, name });
    res.json({ code: 0, data: { id: admin.id, username, name }, message: '管理员创建成功' });
  } catch (e) {
    res.status(500).json({ code: 500, message: '创建管理员失败' });
  }
});

// 编辑管理员
router.put('/admin/:id', adminAuthRequired, async (req, res) => {
  try {
    const { name, phone, roleIds } = req.body || {};
    const adminId = req.params.id;
    const admin = await queryOne('SELECT * FROM admin_users WHERE id = ?', [adminId]);
    if (!admin) return res.json({ code: 404, message: '管理员不存在' });

    if (name || phone) await update('admin_users', { name, phone }, 'id = ?', [adminId]);
    if (roleIds && Array.isArray(roleIds)) {
      await del('admin_role_relations', 'admin_id = ?', [adminId]);
      for (const roleId of roleIds) await insert('admin_role_relations', { admin_id: adminId, role_id: roleId });
    }
    await recordLog(req.adminId, '编辑管理员', 'admin_user', adminId, { name, roleIds });
    res.json({ code: 0, message: '管理员更新成功' });
  } catch (e) {
    res.status(500).json({ code: 500, message: '编辑管理员失败' });
  }
});

// 切换管理员状态
router.put('/admin/:id/status', adminAuthRequired, async (req, res) => {
  try {
    const adminId = req.params.id;
    const admin = await queryOne('SELECT * FROM admin_users WHERE id = ?', [adminId]);
    if (!admin) return res.json({ code: 404, message: '管理员不存在' });
    const newStatus = admin.status === 'active' ? 'inactive' : 'active';
    await update('admin_users', { status: newStatus }, 'id = ?', [adminId]);
    await recordLog(req.adminId, newStatus === 'active' ? 'unban' : 'ban', 'admin_user', adminId, { name: admin.name });
    res.json({ code: 0, message: `管理员已${newStatus === 'active' ? '启用' : '禁用'}` });
  } catch (e) {
    res.status(500).json({ code: 500, message: '切换管理员状态失败' });
  }
});

export default router;