import { useState, useEffect } from 'react';
import { Table, Card, Typography, Tag, Space, Button, Input, Select, message } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { adminApi } from '../../admin/api';
import { formatDate, orderStatusLabel } from '../../constants';

const { Title } = Typography;
const { Option } = Select;

export default function OrderList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [params, setParams] = useState({ page: 1, pageSize: 10 });

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getOrders(params);
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
    { title: '跟单标题', dataIndex: 'opportunity_title', ellipsis: true },
    { title: '购买者', dataIndex: 'buyer_name', width: 100 },
    { title: '发布者', dataIndex: 'seller_name', width: 100 },
    { title: '实付积分', dataIndex: 'actual_price', width: 80 },
    { title: '平台抽成', dataIndex: 'platform_commission', width: 80 },
    { title: '分佣积分', dataIndex: 'seller_income', width: 80 },
    { title: '状态', dataIndex: 'status', width: 100, render: (v) => <Tag>{orderStatusLabel(v)}</Tag> },
    { title: '购买时间', dataIndex: 'created_at', width: 160, render: formatDate },
  ];

  return (
    <div>
      <Title level={4}>订单管理</Title>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
          <Input
            placeholder="搜索标题/用户"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            onChange={(e) => setParams({ ...params, keyword: e.target.value })}
          />
          <Select
            placeholder="选择状态"
            style={{ width: 120 }}
            allowClear
            onChange={(v) => setParams({ ...params, status: v })}
          >
            <Option value="paid">已支付</Option>
            <Option value="refunded">已退款</Option>
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
    </div>
  );
}
