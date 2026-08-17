import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Typography } from 'antd';
import { DollarOutlined, UserOutlined, ShoppingOutlined, RiseOutlined } from '@ant-design/icons';
import { adminApi } from '../../admin/api';

const { Title } = Typography;

export default function FinanceDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    adminApi.getFinance().then(setData).catch(() => {});
  }, []);

  if (!data) return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>;

  return (
    <div>
      <Title level={4}>财务看板</Title>
      <Row gutter={[16, 16]}>
        <Col span={6}><Card><Statistic title="今日订单" value={data.today?.orders || 0} prefix={<ShoppingOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="今日营收" value={data.today?.amount || 0} suffix="积分" prefix={<DollarOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="累计订单" value={data.total?.orders || 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="累计营收" value={data.total?.amount || 0} suffix="积分" /></Card></Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={6}><Card><Statistic title="平台抽成累计" value={data.total?.platform || 0} suffix="积分" /></Card></Col>
        <Col span={6}><Card><Statistic title="卖家收入累计" value={data.total?.seller || 0} suffix="积分" /></Card></Col>
        <Col span={6}><Card><Statistic title="活跃用户" value={data.users?.active || 0} prefix={<UserOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="在架商机" value={data.opportunities?.active || 0} prefix={<RiseOutlined />} /></Card></Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="积分概况">
            <Row gutter={16}>
              <Col span={6}><Statistic title="积分存量" value={data.points?.balance || 0} /></Col>
              <Col span={6}><Statistic title="累计充值" value={data.points?.recharged || 0} /></Col>
              <Col span={6}><Statistic title="累计消费" value={data.points?.consumed || 0} /></Col>
              <Col span={6}><Statistic title="累计过期" value={data.points?.expired || 0} /></Col>
            </Row>
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="近7天交易趋势">
            <Table
              dataSource={data.trend || []}
              rowKey="date"
              pagination={false}
              columns={[
                { title: '日期', dataIndex: 'date' },
                { title: '订单数', dataIndex: 'count' },
                { title: '交易额(积分)', dataIndex: 'amount' },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}