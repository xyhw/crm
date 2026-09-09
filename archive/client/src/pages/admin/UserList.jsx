import { useState, useEffect } from 'react';
import { Table, Card, Typography, Tag, Space, Button, Input, Select, message, Modal, Form, InputNumber, Popconfirm } from 'antd';
import { SearchOutlined, ReloadOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { adminApi } from '../../admin/api';
import { formatDate, levelName } from '../../constants';

const { Title } = Typography;
const { Option } = Select;

export default function UserList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [params, setParams] = useState({ page: 1, pageSize: 10 });
  const [editUser, setEditUser] = useState(null);
  const [editForm] = Form.useForm();
  const [adjustType, setAdjustType] = useState(null); // 'points' | 'credit'
  const [adjustUser, setAdjustUser] = useState(null);
  const [adjustForm] = Form.useForm();

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers(params);
      setList(res.list || []);
      setTotal(res.total || 0);
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [params]);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '手机号', dataIndex: 'phone', width: 120 },
    { title: '昵称', dataIndex: 'nickname', width: 100 },
    { title: '公司', dataIndex: 'company', width: 120 },
    { title: '积分余额', dataIndex: 'points_balance', width: 80 },
    { title: '等级', dataIndex: 'level', width: 80, render: (v) => levelName(v) },
    { title: '信用分', dataIndex: 'credit_score', width: 80 },
    { title: '状态', dataIndex: 'status', width: 80, render: (v) => <Tag color={v === 'active' ? 'green' : 'red'}>{v === 'active' ? '正常' : '禁用'}</Tag> },
    { title: '注册时间', dataIndex: 'created_at', width: 160, render: formatDate },
    {
      title: '操作',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button size="small" icon={<PlusOutlined />} onClick={() => openAdjust(record, 'points')}>
            积分
          </Button>
          <Button size="small" icon={<PlusOutlined />} onClick={() => openAdjust(record, 'credit')}>
            信用分
          </Button>
          <Popconfirm title={`确认${record.status === 'active' ? '禁用' : '启用'}该用户？`} onConfirm={() => handleToggleStatus(record)}>
            <Button size="small" danger={record.status === 'active'}>
              {record.status === 'active' ? '禁用' : '启用'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleEdit = (record) => {
    setEditUser(record);
    editForm.setFieldsValue({
      nickname: record.nickname,
      company: record.company,
    });
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      await adminApi.updateUser(editUser.id, values);
      message.success('更新成功');
      setEditUser(null);
      fetchList();
    } catch (e) {
      message.error(e.message);
    }
  };

  const handleToggleStatus = async (record) => {
    const newStatus = record.status === 'active' ? 'banned' : 'active';
    try {
      await adminApi.updateUser(record.id, { status: newStatus });
      message.success('状态已更新');
      fetchList();
    } catch (e) {
      message.error(e.message);
    }
  };

  const openAdjust = (record, type) => {
    setAdjustType(type);
    setAdjustUser(record);
    adjustForm.resetFields();
  };

  const handleAdjustSubmit = async () => {
    try {
      const values = await adjustForm.validateFields();
      const body = {
        delta: values.delta,
        reason: values.reason || (adjustType === 'points' ? '管理员调整积分' : '管理员调整信用分'),
      };
      if (adjustType === 'points') {
        await adminApi.adjustPoints(adjustUser.id, body);
      } else {
        await adminApi.adjustCredit(adjustUser.id, body);
      }
      message.success(`${adjustType === 'points' ? '积分' : '信用分'}调整成功`);
      setAdjustUser(null);
      fetchList();
    } catch (e) {
      message.error(e.message);
    }
  };

  return (
    <div>
      <Title level={4}>用户管理</Title>
      <Card>
        <div className="action-row">
          <Input
            placeholder="搜索手机号/昵称"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            allowClear
            onChange={(e) => setParams({ ...params, keyword: e.target.value, page: 1 })}
          />
          <Select
            placeholder="选择状态"
            style={{ width: 120 }}
            allowClear
            onChange={(v) => setParams({ ...params, status: v, page: 1 })}
          >
            <Option value="active">正常</Option>
            <Option value="banned">禁用</Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={fetchList}>
            刷新
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={list}
          rowKey="id"
          loading={loading}
          pagination={{
            current: params.page,
            pageSize: params.pageSize,
            total,
            onChange: (page, pageSize) => setParams({ ...params, page, pageSize }),
          }}
        />
      </Card>

      <Modal title="编辑用户" open={!!editUser} onOk={handleEditSubmit} onCancel={() => setEditUser(null)}>
        <Form form={editForm} layout="vertical">
          <Form.Item name="nickname" label="昵称">
            <Input />
          </Form.Item>
          <Form.Item name="company" label="公司">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`调整${adjustType === 'points' ? '积分' : '信用分'} - ${adjustUser?.nickname || ''}`}
        open={!!adjustUser}
        onOk={handleAdjustSubmit}
        onCancel={() => setAdjustUser(null)}
      >
        <Form form={adjustForm} layout="vertical">
          <Form.Item
            name="delta"
            label={`调整数值（${adjustType === 'points' ? '积分' : '信用分'}，正数增加/负数减少）`}
            rules={[{ required: true, message: '请输入调整数值' }]}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="调整原因">
            <Input placeholder={adjustType === 'points' ? '例如：活动奖励' : '例如：违规扣除'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
