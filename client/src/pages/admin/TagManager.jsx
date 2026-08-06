import { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Modal, Input, Popconfirm, message, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { adminApi } from '../../admin/api';

const { Title } = Typography;

export default function TagManager() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [params, setParams] = useState({ page: 1, pageSize: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getTags(params);
      setList(res.list || []);
      setTotal(res.total || 0);
    } catch (e) { message.error(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchList(); }, [params]);

  const openCreate = () => { setEditingItem(null); setName(''); setModalOpen(true); };
  const openEdit = (r) => { setEditingItem(r); setName(r.name); setModalOpen(true); };

  const handleSubmit = async () => {
    if (!name) { message.error('名称不能为空'); return; }
    setSubmitting(true);
    try {
      if (editingItem) {
        await adminApi.updateTag(editingItem.id, { name });
      } else {
        await adminApi.createTag({ name });
      }
      message.success(editingItem ? '更新成功' : '创建成功');
      setModalOpen(false);
      fetchList();
    } catch (e) { message.error(e.message); } finally { setSubmitting(false); }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '名称', dataIndex: 'name' },
    { title: '排序', dataIndex: 'sort_order', width: 80 },
    {
      title: '操作', width: 150,
      render: (_, r) => (
        <>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => adminApi.deleteTag(r.id).then(fetchList).catch((e) => message.error(e.message))}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>标签管理</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchList}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建标签</Button>
        </Space>
      </div>
      <Card>
        <Table columns={columns} dataSource={list} rowKey="id" loading={loading} pagination={{ current: params.page, pageSize: params.pageSize, total, onChange: (p, ps) => setParams({ ...params, page: p, pageSize: ps }) }} />
      </Card>
      <Modal title={editingItem ? '编辑标签' : '新建标签'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} confirmLoading={submitting}>
        <Input placeholder="标签名称" value={name} onChange={(e) => setName(e.target.value)} />
      </Modal>
    </div>
  );
}