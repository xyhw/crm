import { useState, useEffect } from 'react';
import { Table, Card, Typography, Tag, Space, Button, Input, Select, message } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { adminApi } from '../../admin/api';
import { formatDate, pointsSourceTypeLabel } from '../../constants';

const { Title } = Typography;
const { Option } = Select;

export default function PointsList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [params, setParams] = useState({ page: 1, pageSize: 10 });

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getPointsLogs(params);
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
    { title: '用户', dataIndex: 'user_name', width: 100 },
    { title: '变化类型', dataIndex: 'source_type', width: 100, render: (v) => pointsSourceTypeLabel(v) },
    { title: '变化积分', dataIndex: 'delta', width: 100, render: (v) => <span style={{ color: v > 0 ? '#048C47' : '#E54848' }}>{v > 0 ? '+' : ''}{v}</span> },
    { title: '变化后余额', dataIndex: 'balance_after', width: 100 },
    { title: '来源说明', dataIndex: 'source_title', width: 150 },
    { title: '时间', dataIndex: 'created_at', width: 160, render: formatDate },
  ];

  return (
    <div>
      <Title level={4}>积分管理</Title>
      <Card>
        <div className="action-row">
          <Input
            placeholder="搜索用户"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            onChange={(e) => setParams({ ...params, keyword: e.target.value })}
          />
          <Select
            placeholder="选择类型"
            style={{ width: 120 }}
            allowClear
            onChange={(v) => setParams({ ...params, sourceType: v })}
          >
            <Option value="recharge">充值</Option>
            <Option value="register_gift">注册赠送</Option>
            <Option value="invite_gift">邀请奖励</Option>
            <Option value="purchase_income">分佣收入</Option>
            <Option value="commission">分佣奖励</Option>
            <Option value="reward">奖励</Option>
            <Option value="consume">消费</Option>
            <Option value="expire">过期</Option>
            <Option value="admin_adjust">管理员调整</Option>
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
