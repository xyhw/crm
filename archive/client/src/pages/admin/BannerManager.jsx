import { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Modal, Input, Popconfirm, Select, DatePicker, message, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { adminApi } from '../../admin/api';
import { formatDate } from '../../constants';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function BannerManager() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [params, setParams] = useState({ page: 1, pageSize: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [form, setForm] = useState({ title: '', imageUrl: '', linkUrl: '', sortOrder: 0, status: 'active' });
  const [dateRange, setDateRange] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getBanners(params);
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
    setEditingBanner(null);
    setForm({ title: '', imageUrl: '', linkUrl: '', sortOrder: 0, status: 'active' });
    setDateRange(null);
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingBanner(record);
    setForm({ title: record.title, imageUrl: record.image_url, linkUrl: record.link_url || '', sortOrder: record.sort_order || 0, status: record.status });
    setDateRange(record.start_at ? [dayjs(record.start_at), dayjs(record.end_at)] : null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.imageUrl) {
      message.error('标题和图片不能为空');
      return;
    }
    setSubmitting(true);
    try {
      const data = {
        ...form,
        startAt: dateRange ? dateRange[0].format('YYYY-MM-DD HH:mm:ss') : null,
        endAt: dateRange ? dateRange[1].format('YYYY-MM-DD HH:mm:ss') : null,
      };
      if (editingBanner) {
        await adminApi.updateBanner(editingBanner.id, data);
        message.success('更新成功');
      } else {
        await adminApi.createBanner(data);
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
      await adminApi.deleteBanner(id);
      message.success('删除成功');
      fetchList();
    } catch (e) {
      message.error(e.message);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    {
      title: '图片', dataIndex: 'image_url', width: 100,
      render: (url) => <img src={url} alt="" style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4 }} />,
    },
    { title: '链接', dataIndex: 'link_url', ellipsis: true, width: 200 },
    { title: '排序', dataIndex: 'sort_order', width: 60 },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (v, record) => <Select value={v} size="small" style={{ width: 80 }} options={[{ label: '启用', value: 'active' }, { label: '停用', value: 'inactive' }]} onChange={(s) => adminApi.updateBanner(record.id, { status: s }).then(() => fetchList())} />,
    },
    { title: '创建时间', dataIndex: 'created_at', width: 160, render: formatDate },
    {
      title: '操作', width: 150,
      render: (_, record) => (
        <>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Banner管理</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchList}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建Banner</Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input.Search
            placeholder="按标题搜索"
            allowClear
            style={{ width: 220 }}
            onSearch={(v) => setParams((p) => ({ ...p, page: 1, keyword: v || undefined }))}
          />
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 120 }}
            options={[{ value: 'active', label: '启用' }, { value: 'inactive', label: '下线' }]}
            onChange={(v) => setParams((p) => ({ ...p, page: 1, status: v }))}
          />
        </Space>
      </Card>

      <Card>
        <Table columns={columns} dataSource={list} rowKey="id" loading={loading} pagination={{ current: params.page, pageSize: params.pageSize, total, onChange: (p, ps) => setParams({ ...params, page: p, pageSize: ps }) }} />
      </Card>

      <Modal title={editingBanner ? '编辑Banner' : '新建Banner'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} confirmLoading={submitting} width={520}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div className="form-label">标题</div>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Banner标题" />
          </div>
          <div>
            <div className="form-label">图片URL</div>
            <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
            {form.imageUrl && <img src={form.imageUrl} alt="预览" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />}
          </div>
          <div>
            <div className="form-label">跳转链接</div>
            <Input value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} placeholder="可选，点击后跳转的URL" />
          </div>
          <div>
            <div className="form-label">排序（越小越前）</div>
            <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
          </div>
          <div>
            <div className="form-label">有效时间</div>
            <RangePicker showTime value={dateRange} onChange={setDateRange} style={{ width: '100%' }} />
          </div>
          <div>
            <div className="form-label">状态</div>
            <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })} style={{ width: '100%' }} options={[{ label: '启用', value: 'active' }, { label: '停用', value: 'inactive' }]} />
          </div>
        </div>
      </Modal>
    </div>
  );
}