import { useState, useEffect } from 'react';
import { Table, Card, Typography, Tag, Space, Button, message, Modal, Form, InputNumber, Switch } from 'antd';
import { ReloadOutlined, EditOutlined } from '@ant-design/icons';
import { adminApi } from '../../admin/api';

const { Title } = Typography;

export default function LevelConfig() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);
  const [editForm] = Form.useForm();

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getLevels();
      setList(res || []);
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '等级名称', dataIndex: 'name', width: 100 },
    { title: '购买折扣', dataIndex: 'purchase_discount', width: 100, render: (v) => `${((Number(v) || 1) * 100).toFixed(0)}%` },
    { title: '分佣加成', dataIndex: 'commission_bonus', width: 100, render: (v) => `+${((Number(v) || 0) * 100).toFixed(0)}%` },
    { title: '购买率阈值', dataIndex: 'purchase_rate_threshold', width: 100, render: (v) => `${v}%` },
    { title: '无效率阈值', dataIndex: 'invalid_rate_threshold', width: 100, render: (v) => `${v}%` },
    { title: '有用率阈值', dataIndex: 'helpful_rate_threshold', width: 100, render: (v) => `${v}%` },
    { title: '活跃度阈值', dataIndex: 'activity_threshold', width: 100 },
    { title: '免审', dataIndex: 'free_audit', width: 70, render: (v) => (v ? <Tag color="green">是</Tag> : <Tag>否</Tag>) },
    { title: '标记权重', dataIndex: 'mark_weight', width: 90 },
    {
      title: '操作',
      width: 80,
      render: (_, record) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
          编辑
        </Button>
      ),
    },
  ];

  const handleEdit = (record) => {
    setEditItem(record);
    editForm.setFieldsValue(record);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      await adminApi.updateLevel(editItem.id, {
        purchaseDiscount: values.purchase_discount,
        commissionBonus: values.commission_bonus,
        purchaseRateThreshold: values.purchase_rate_threshold,
        invalidRateThreshold: values.invalid_rate_threshold,
        helpfulRateThreshold: values.helpful_rate_threshold,
        activityThreshold: values.activity_threshold,
        freeAudit: values.free_audit ? 1 : 0,
        markWeight: values.mark_weight,
      });
      message.success('更新成功');
      setEditItem(null);
      fetchList();
    } catch (e) {
      message.error(e.message);
    }
  };

  return (
    <div>
      <Title level={4}>等级配置</Title>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button icon={<ReloadOutlined />} onClick={fetchList}>
            刷新
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={list}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 900 }}
        />
      </Card>

      <Modal
        title={`编辑等级 - ${editItem?.name || ''}`}
        open={!!editItem}
        onOk={handleEditSubmit}
        onCancel={() => setEditItem(null)}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="purchase_discount" label="购买折扣（0.9 = 9折）" rules={[{ required: true }]}>
            <InputNumber min={0} max={1} step={0.05} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="commission_bonus" label="分佣加成（0.1 = +10%）" rules={[{ required: true }]}>
            <InputNumber min={0} max={1} step={0.05} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="purchase_rate_threshold" label="购买率阈值（%）" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="invalid_rate_threshold" label="无效率阈值（%，低于此值有效）" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="helpful_rate_threshold" label="有用率阈值（%）" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="activity_threshold" label="活跃度阈值（分）" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="mark_weight" label="无效标记权重" rules={[{ required: true }]}>
            <InputNumber min={1} max={3} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="free_audit" label="分享摘要免审" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
