import { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Modal, Input, Popconfirm, Select, DatePicker, Switch, message, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { adminApi } from '../../admin/api';
import { formatDate } from '../../constants';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const MEDIA_TYPES = [
  { label: '纯文本', value: 'text' },
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
  { label: '图文混合', value: 'mixed' },
];

export default function AnnouncementManager() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [params, setParams] = useState({ page: 1, pageSize: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', mediaType: 'text', mediaUrl: '', linkUrl: '', isTop: false, sortOrder: 0 });
  const [dateRange, setDateRange] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAnnouncements(params);
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
    setEditing(null);
    setForm({ title: '', content: '', mediaType: 'text', mediaUrl: '', linkUrl: '', isTop: false, sortOrder: 0 });
    setDateRange(null);
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    setForm({
      title: record.title,
      content: record.content || '',
      mediaType: record.media_type || 'text',
      mediaUrl: record.media_url || '',
      linkUrl: record.link_url || '',
      isTop: record.is_top === 1,
      sortOrder: record.sort_order || 0,
    });
    setDateRange(record.start_at ? [dayjs(record.start_at), dayjs(record.end_at)] : null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      message.error('标题不能为空');
      return;
    }
    if (!form.content.trim() && !form.mediaUrl.trim()) {
      message.error('正文和附件不能同时为空');
      return;
    }
    setSubmitting(true);
    try {
      const data = {
        title: form.title,
        content: form.content,
        mediaType: form.mediaType,
        mediaUrl: form.mediaUrl,
        linkUrl: form.linkUrl,
        isTop: form.isTop,
        sortOrder: Number(form.sortOrder) || 0,
        startAt: dateRange ? dateRange[0].format('YYYY-MM-DD HH:mm:ss') : null,
        endAt: dateRange ? dateRange[1].format('YYYY-MM-DD HH:mm:ss') : null,
      };
      if (editing) {
        await adminApi.updateAnnouncement(editing.id, data);
        message.success('更新成功');
      } else {
        await adminApi.createAnnouncement(data);
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
      await adminApi.deleteAnnouncement(id);
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
      title: '形式', dataIndex: 'media_type', width: 90,
      render: (v) => MEDIA_TYPES.find((m) => m.value === v)?.label || v,
    },
    { title: '排序', dataIndex: 'sort_order', width: 60 },
    {
      title: '置顶', dataIndex: 'is_top', width: 60,
      render: (v) => (v === 1 ? '是' : '否'),
    },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (v, record) => (
        <Select
          value={v}
          size="small"
          style={{ width: 80 }}
          options={[{ label: '上线', value: 'active' }, { label: '下线', value: 'inactive' }]}
          onChange={(s) => adminApi.updateAnnouncement(record.id, { status: s }).then(() => fetchList())}
        />
      ),
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
        <Title level={4} style={{ margin: 0 }}>公告管理</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchList}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>发布公告</Button>
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
          <Select
            placeholder="置顶"
            allowClear
            style={{ width: 120 }}
            options={[{ value: 1, label: '已置顶' }, { value: 0, label: '未置顶' }]}
            onChange={(v) => setParams((p) => ({ ...p, page: 1, isTop: v }))}
          />
        </Space>
      </Card>

      <Card>
        <Table columns={columns} dataSource={list} rowKey="id" loading={loading} pagination={{ current: params.page, pageSize: params.pageSize, total, onChange: (p, ps) => setParams({ ...params, page: p, pageSize: ps }) }} />
      </Card>

      <Modal title={editing ? '编辑公告' : '发布公告'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} confirmLoading={submitting} width={560}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div className="form-label">标题</div>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="公告标题" maxLength={100} />
          </div>
          <div>
            <div className="form-label">内容形式</div>
            <Select value={form.mediaType} onChange={(v) => setForm({ ...form, mediaType: v })} style={{ width: '100%' }} options={MEDIA_TYPES} />
          </div>
          <div>
            <div className="form-label">正文</div>
            <Input.TextArea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="公告正文内容" rows={4} />
          </div>
          <div>
            <div className="form-label">附件URL（图片/视频）</div>
            <Input value={form.mediaUrl} onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })} placeholder="https://..." />
            {form.mediaUrl && form.mediaType !== 'video' && <img src={form.mediaUrl} alt="预览" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />}
          </div>
          <div>
            <div className="form-label">跳转链接（可选）</div>
            <Input value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} placeholder="点击公告后跳转的URL" />
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ flex: 1 }}>
              <div className="form-label">置顶</div>
              <Switch checked={form.isTop} onChange={(v) => setForm({ ...form, isTop: v })} checkedChildren="置顶" unCheckedChildren="普通" />
            </div>
            <div style={{ flex: 1 }}>
              <div className="form-label">排序（越小越前）</div>
              <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <div className="form-label">有效时间（留空为永久有效）</div>
            <RangePicker showTime value={dateRange} onChange={setDateRange} style={{ width: '100%' }} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
