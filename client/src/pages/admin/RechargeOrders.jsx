import { useState, useEffect } from 'react';
import { Table, Card, Typography, Tag, Statistic, Row, Col, Button, Input, Select, message, Alert } from 'antd';
import { SearchOutlined, ReloadOutlined, SyncOutlined } from '@ant-design/icons';
import { adminApi } from '../../admin/api';
import { formatDate } from '../../constants';

const { Title } = Typography;
const { Option } = Select;

const STATUS_META = {
  pending: { label: '待支付', color: 'orange' },
  paid: { label: '已支付', color: 'green' },
  failed: { label: '失败', color: 'red' },
  expired: { label: '已过期', color: 'default' },
  refunded: { label: '已退款', color: 'volcano' },
};

const CHANNEL_LABEL = {
  wechat: '虚拟支付',
  waffo: 'Waffo',
  mock: 'Mock',
  alipay: '支付宝',
  stripe: 'Stripe',
};

function fen(v) {
  return `¥${((Number(v) || 0) / 100).toFixed(2)}`;
}

export default function RechargeOrders() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [params, setParams] = useState({ page: 1, pageSize: 10 });
  const [summary, setSummary] = useState(null);
  const [syncingOrderNo, setSyncingOrderNo] = useState('');

  const fetchSummary = async () => {
    try {
      const data = await adminApi.getRechargeSummary();
      setSummary(data);
    } catch {
      setSummary(null);
    }
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getRechargeOrders(params);
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

  useEffect(() => {
    fetchSummary();
  }, []);

  // 查单补账：仅 pending 单，向渠道查真实状态，已支付则幂等入账
  const doSync = async (record) => {
    if (syncingOrderNo) return;
    setSyncingOrderNo(record.order_no);
    try {
      const res = await adminApi.syncRechargeOrder(record.order_no);
      message.success(res?.settled ? '查单成功，已补记积分' : (res?.already ? '订单已入账' : '渠道侧未支付，未做入账'));
      await Promise.all([fetchSummary(), fetchList()]);
    } catch (e) {
      message.error(e.message || '查单失败');
    } finally {
      setSyncingOrderNo('');
    }
  };

  const reconcile = summary?.reconcile;
  const hasLedgerGap = reconcile && (Number(reconcile.diff) !== 0 || Number(reconcile.missingLedgerOrders) > 0);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '订单号', dataIndex: 'order_no', width: 200 },
    {
      title: '用户',
      dataIndex: 'user_name',
      width: 130,
      render: (v, record) => (
        <span>
          {v || '-'}
          {record.user_phone ? <span style={{ color: '#999' }}> {record.user_phone}</span> : null}
        </span>
      ),
    },
    {
      title: '渠道',
      dataIndex: 'channel',
      width: 90,
      render: (v) => CHANNEL_LABEL[v] || v || '-',
    },
    { title: '状态', dataIndex: 'status', width: 90, render: (v) => <Tag color={STATUS_META[v]?.color || 'default'}>{STATUS_META[v]?.label || v}</Tag> },
    { title: '积分', dataIndex: 'amount', width: 80 },
    { title: '金额', dataIndex: 'price', width: 90, render: fen },
    { title: '渠道单号', dataIndex: 'pay_channel_order_no', width: 160, render: (v) => v || '-' },
    { title: '支付时间', dataIndex: 'paid_at', width: 160, render: (v) => (v ? formatDate(v) : '-') },
    { title: '创建时间', dataIndex: 'created_at', width: 160, render: formatDate },
    {
      title: '操作',
      width: 110,
      render: (_, record) =>
        record.status === 'pending' ? (
          <Button
            size="small"
            icon={<SyncOutlined />}
            loading={syncingOrderNo === record.order_no}
            onClick={() => doSync(record)}
          >
            查单补账
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <Title level={4}>充值对账</Title>

      {reconcile && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}><Statistic title="今日成功" value={summary.today?.orders || 0} suffix="笔" /></Col>
            <Col span={6}><Statistic title="今日金额" value={fen(summary.today?.price)} /></Col>
            <Col span={6}><Statistic title="今日积分" value={summary.today?.points || 0} /></Col>
            <Col span={6}>
              <Statistic
                title="已支付/已入账(积分)"
                value={reconcile.paidOrderPoints}
                suffix={`/ ${reconcile.ledgerRechargePoints}`}
              />
            </Col>
          </Row>
          {hasLedgerGap ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginTop: 12 }}
              message={`对账差异：${reconcile.missingLedgerOrders || 0} 笔未入账（${reconcile.missingLedgerPoints || 0} 积分），差额 ${reconcile.diff}，请核查`}
            />
          ) : (
            <Alert type="success" showIcon style={{ marginTop: 12 }} message="对账一致：已支付订单积分与入账流水一致" />
          )}
        </Card>
      )}

      <Card>
        <div className="action-row">
          <Input
            placeholder="搜索用户昵称/手机号"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            onChange={(e) => setParams({ ...params, keyword: e.target.value })}
          />
          <Select
            placeholder="订单状态"
            style={{ width: 120 }}
            allowClear
            onChange={(v) => setParams({ ...params, status: v })}
          >
            <Option value="pending">待支付</Option>
            <Option value="paid">已支付</Option>
            <Option value="failed">失败</Option>
            <Option value="expired">已过期</Option>
            <Option value="refunded">已退款</Option>
          </Select>
          <Select
            placeholder="支付渠道"
            style={{ width: 120 }}
            allowClear
            onChange={(v) => setParams({ ...params, channel: v })}
          >
            <Option value="wechat">虚拟支付</Option>
            <Option value="waffo">Waffo</Option>
            <Option value="mock">Mock</Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={() => { fetchList(); fetchSummary(); }}>
            刷新
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={list}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
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
