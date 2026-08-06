import { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Modal, Input, Popconfirm, Select, message, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { adminApi } from '../../admin/api';

const { Title } = Typography;

export default function CategoryManager() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ name: '', icon: '', sortOrder: 0 });
  const [submitting, setSubmitting] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getCategories();
      setList(res.list || []);
    } catch (e) { message.error(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchList(); }, []);

  const openCreate = () => { setEditingItem(null); setForm({ name: '', icon: '', sortOrder: 0 }); setModalOpen(true); };
  const openEdit = (r) => { setEditingItem(r); setForm({ name: r.name, icon: r.icon, sortOrder: r.sort_order }); setModalOpen(true); };

  const handleSubmit = async () => {
    if (!form.name) { message.error('名称不能为空'); return; }
    setSubmitting(true);
    try {
      if (editingItem) {
        await adminApi.updateCategory(editingItem.id, form);
      } else {
        await adminApi.createCategory(form);
      }
      message.success(editingItem ? '更新成功' : '创建成功');
      setModalOpen(false);
      fetchList();
    } catch (e) { message.error(e.message); } finally { setSubmitting(false); }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '图标', dataIndex: 'icon', width: 60 },
    { title: '名称', dataIndex: 'name' },
    { title: '排序', dataIndex: 'sort_order', width: 60 },
    {
      title: '操作', width: 150,
      render: (_, r) => (
        <>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => adminApi.deleteCategory(r.id).then(fetchList).catch((e) => message.error(e.message))}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>分类管理</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchList}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建分类</Button>
        </Space>
      </div>
      <Card>
        <Table columns={columns} dataSource={list} rowKey="id" loading={loading} pagination={false} />
      </Card>
      <Modal title={editingItem ? '编辑分类' : '新建分类'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} confirmLoading={submitting}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input placeholder="名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="图标" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
          <Input type="number" placeholder="排序" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
        </div>
      </Modal>
    </div>
  );
}