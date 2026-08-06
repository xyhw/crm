import { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Modal, Input, Select, Popconfirm, message, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { adminApi } from '../../admin/api';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function AdminManage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [params, setParams] = useState({ page: 1, pageSize: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', name: '', phone: '', status: 'active' });
  const [submitting, setSubmitting] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAdmins(params);
      setList(res.list || []);
      setTotal(res.total || 0);
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, [params]);

  const openCreate = () => {
    setEditingItem(null);
    setForm({ username: '', password: '', name: '', phone: '', status: 'active' });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingItem(record);
    setForm({ ...record, password: '' });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!editingItem && (!form.username || !form.password)) {
      message.error('用户名和密码不能为空');
      return;
    }
    setSubmitting(true);
    try {
      if (editingItem) {
        const data = { name: form.name, phone: form.phone, status: form.status };
        if (form.password) data.password = form.password;
        await adminApi.updateAdmin(editingItem.id, data);
        message.success('更新成功');
      } else {
        await adminApi.createAdmin(form);
        message.success('创建成功');
      }
      setModalOpen(false);
      fetchList();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await adminApi.deleteAdmin(id);
      message.success('删除成功');
      fetchList();
    } catch (e) {
      message.error(e.message);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '用户名', dataIndex: 'username' },
    { title: '姓名', dataIndex: 'name', render: (v) => v || '-' },
    { title: '电话', dataIndex: 'phone', render: (v) => v || '-' },
    { title: '状态', dataIndex: 'status', width: 80, render: (v, record) => <Select size="small" value={v} style={{ width: 80 }} options={[{ label: '启用', value: 'active' }, { label: '停用', value: 'inactive' }]} onChange={(s) => adminApi.updateAdmin(record.id, { status: s }).then(fetchList)} /> },
    { title: '创建时间', dataIndex: 'created_at', width: 160, render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    {
      title: '操作', width: 180,
      render: (_, record) => list.length > 1 ? (
        <>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </>
      ) : (
        <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>管理员管理</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchList}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建管理员</Button>
        </Space>
      </div>
      <Card>
        <Table columns={columns} dataSource={list} rowKey="id" loading={loading} pagination={{ current: params.page, pageSize: params.pageSize, total, onChange: (p, ps) => setParams({ ...params, page: p, pageSize: ps }) }} />
      </Card>
      <Modal title={editingItem ? '编辑管理员' : '新建管理员'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} confirmLoading={submitting} width={420}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>用户名</div>
            <Input value={form.username} disabled={!!editingItem} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="管理员登录用户名" />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>{editingItem ? '新密码（留空不修改）' : '密码'}</div>
            <Input.Password value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editingItem ? '留空则不修改密码' : '设置密码'} />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>姓名</div>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：运营管理员" />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>电话</div>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="联系方式" />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>状态</div>
            <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })} style={{ width: '100%' }} options={[{ label: '启用', value: 'active' }, { label: '停用', value: 'inactive' }]} />
          </div>
        </div>
      </Modal>
    </div>
  );
}