import { useState, useEffect } from 'react';
import { Table, Card, Typography, Button, Modal, Form, Input, Select, Tag, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { adminApi } from '../../admin/api';

const { Title, Text } = Typography;

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRole, setEditRole] = useState(null);
  const [editAdmin, setEditAdmin] = useState(null);
  const [newRoleOpen, setNewRoleOpen] = useState(false);
  const [newAdminOpen, setNewAdminOpen] = useState(false);
  const [form] = Form.useForm();
  const [adminForm] = Form.useForm();
  const [roleForm] = Form.useForm();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes, adminsRes] = await Promise.all([
        adminApi.fetchRoles(),
        adminApi.fetchPermissions(),
        adminApi.fetchAdmins()
      ]);
      setRoles(rolesRes || []);
      setPermissions(permsRes || []);
      setAdmins(adminsRes || []);
    } catch (e) { message.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const permGroups = {};
  (permissions || []).forEach(p => {
    if (!permGroups[p.group]) permGroups[p.group] = [];
    permGroups[p.group].push(p);
  });

  const roleColumns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '角色名', dataIndex: 'name', width: 120 },
    { title: '描述', dataIndex: 'description', width: 200 },
    { title: '权限数', dataIndex: 'permissions', width: 80, render: (v) => v?.length || 0 },
    {
      title: '权限列表', dataIndex: 'permissions', render: (v) => v?.length > 0 ? v.map(p => <Tag key={p} color="blue">{p}</Tag>) : <Text type="secondary">无</Text>
    },
    {
      title: '操作', width: 150,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditRole(r)}>编辑</Button>
          <Popconfirm title="确定删除此角色？" onConfirm={() => handleDeleteRole(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const adminColumns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '用户名', dataIndex: 'username', width: 120 },
    { title: '姓名', dataIndex: 'name', width: 120 },
    { title: '手机号', dataIndex: 'phone', width: 120 },
    { title: '状态', dataIndex: 'status', width: 80, render: (v) => <Tag color={v === 'active' ? 'green' : 'red'}>{v === 'active' ? '正常' : '禁用'}</Tag> },
    {
      title: '角色', dataIndex: 'roles', render: (v) => (v || []).map(r => <Tag key={r.id}>{r.name}</Tag>)
    },
    {
      title: '操作',
      render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => handleEditAdmin(r)}>编辑角色</Button>
          <Popconfirm title="确定切换状态？" onConfirm={() => handleToggleAdminStatus(r)}>
            <Button size="small" danger>{r.status === 'active' ? '禁用' : '启用'}</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const handleEditRole = (role) => {
    setEditRole(role);
    roleForm.setFieldsValue({ name: role.name, description: role.description, permissions: role.permissions || [] });
  };

  const handleDeleteRole = async (id) => {
    try {
      await adminApi.deleteRole(id);
      message.success('角色已删除');
      fetchAll();
    } catch (e) { message.error(e.message); }
  };

  const handleSaveRole = async () => {
    try {
      const vals = await roleForm.validateFields();
      if (editRole) await adminApi.updateRole(editRole.id, vals);
      else await adminApi.createRole(vals);
      message.success(editRole ? '角色已更新' : '角色已创建');
      setEditRole(null);
      setNewRoleOpen(false);
      roleForm.resetFields();
      fetchAll();
    } catch (e) { message.error(e.message); }
  };

  const handleEditAdmin = (admin) => {
    setEditAdmin(admin);
    adminForm.setFieldsValue({ name: admin.name, phone: admin.phone, roleIds: admin.roles?.map(r => r.id) || [] });
  };

  const handleSaveAdmin = async () => {
    try {
      const vals = await adminForm.validateFields();
      await adminApi.updateAdminWithRoles(editAdmin.id, vals);
      message.success('管理员已更新');
      setEditAdmin(null);
      adminForm.resetFields();
      fetchAll();
    } catch (e) { message.error(e.message); }
  };

  const handleToggleAdminStatus = async (admin) => {
    try {
      await adminApi.toggleAdminStatus(admin.id);
      message.success('状态已更新');
      fetchAll();
    } catch (e) { message.error(e.message); }
  };

  const handleCreateAdmin = async () => {
    try {
      const vals = await adminForm.validateFields();
      await adminApi.createAdminWithRoles(vals);
      message.success('管理员创建成功');
      setNewAdminOpen(false);
      adminForm.resetFields();
      fetchAll();
    } catch (e) { message.error(e.message); }
  };

  return (
    <div>
      <Title level={4}>角色与管理员管理</Title>

      <Card title="角色管理" style={{ marginBottom: 16 }}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchAll}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditRole(null); setNewRoleOpen(true); roleForm.resetFields(); }}>新建角色</Button>
          </Space>
        }
      >
        <Table columns={roleColumns} dataSource={roles} rowKey="id" loading={loading} pagination={false} />
      </Card>

      <Card title="管理员管理"
        extra={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditAdmin(null); setNewAdminOpen(true); adminForm.resetFields(); }}>新建管理员</Button>
          </Space>
        }
      >
        <Table columns={adminColumns} dataSource={admins} rowKey="id" loading={loading} pagination={false} />
      </Card>

      <Modal title={editRole ? '编辑角色' : '新建角色'} open={newRoleOpen || !!editRole} onOk={handleSaveRole} onCancel={() => { setEditRole(null); setNewRoleOpen(false); roleForm.resetFields(); }}>
        <Form form={roleForm} layout="vertical">
          <Form.Item name="name" label="角色名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="permissions" label="权限点">
            <Select mode="multiple" placeholder="选择权限">
              {Object.entries(permGroups).map(([group, perms]) => (
                <Select.OptGroup key={group} label={group}>
                  {perms.map(p => <Select.Option key={p.key} value={p.key}>{p.label}</Select.Option>)}
                </Select.OptGroup>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={editAdmin ? '编辑管理员' : '新建管理员'} open={editAdmin && newAdminOpen ? false : Boolean(editAdmin || newAdminOpen)} onOk={editAdmin ? handleSaveAdmin : handleCreateAdmin} onCancel={() => { setEditAdmin(null); setNewAdminOpen(false); adminForm.resetFields(); }}>
        <Form form={adminForm} layout="vertical">
          {!editAdmin && (
            <>
              <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="password" label="密码" rules={[{ required: true }]}>
                <Input.Password />
              </Form.Item>
            </>
          )}
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input />
          </Form.Item>
          <Form.Item name="roleIds" label="角色">
            <Select mode="multiple" placeholder="选择角色">
              {roles.map(r => <Select.Option key={r.id} value={r.id}>{r.name}</Select.Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}