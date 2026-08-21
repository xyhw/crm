import { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Table, Statistic, message } from 'antd';
import { UserOutlined, FileTextOutlined, OrderedListOutlined, CreditCardOutlined, RiseOutlined, DollarOutlined } from '@ant-design/icons';
import { adminApi } from '../../admin/api';

const { Title } = Typography;

export default function StatsDetailed() {
  const [dashboard, setDashboard] = useState(null);
  const [trends, setTrends] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getDashboard().then(setDashboard).catch(() => {}),
      adminApi.getTrends().then(setTrends).catch(() => {}),
      adminApi.getDistribution().then(setDistribution).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Title level={4}>数据统计</Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}><Card><Statistic title="总用户数" value={dashboard?.totalUsers || 0} prefix={<UserOutlined />} valueStyle={{ color: '#143a75' }} /></Card></Col>
        <Col span={4}><Card><Statistic title="总商机数" value={dashboard?.totalOpportunities || 0} prefix={<FileTextOutlined />} valueStyle={{ color: '#148a57' }} /></Card></Col>
        <Col span={4}><Card><Statistic title="总订单数" value={dashboard?.totalOrders || 0} prefix={<OrderedListOutlined />} valueStyle={{ color: '#d88006' }} /></Card></Col>
        <Col span={4}><Card><Statistic title="总积分量" value={dashboard?.totalPoints || 0} prefix={<CreditCardOutlined />} valueStyle={{ color: '#d93a2b' }} /></Card></Col>
        <Col span={4}><Card><Statistic title="今日订单" value={dashboard?.todayOrders || 0} prefix={<RiseOutlined />} valueStyle={{ color: '#143a75' }} /></Card></Col>
        <Col span={4}><Card><Statistic title="今日收入" value={dashboard?.todayRevenue || 0} suffix="积分" prefix={<DollarOutlined />} valueStyle={{ color: '#148a57' }} /></Card></Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="近7天趋势" loading={loading}>
            <Card size="small" title="新用户">
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                {(trends?.users || []).map((d, i) => (
                  <div key={i} style={{ textAlign: 'center', minWidth: 80 }}>
                    <div style={{ fontSize: 12, color: '#999' }}>{d.date}</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{d.count}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card size="small" title="新商机">
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                {(trends?.opportunities || []).map((d, i) => (
                  <div key={i} style={{ textAlign: 'center', minWidth: 80 }}>
                    <div style={{ fontSize: 12, color: '#999' }}>{d.date}</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{d.count}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card size="small" title="收入">
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                {(trends?.revenue || []).map((d, i) => (
                  <div key={i} style={{ textAlign: 'center', minWidth: 80 }}>
                    <div style={{ fontSize: 12, color: '#999' }}>{d.date}</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{d.amount}</div>
                  </div>
                ))}
              </div>
            </Card>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="分布统计" loading={loading}>
            <Card size="small" title="商机分类分布">
              {(distribution?.oppCategories || []).map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>{d.name}</span><span style={{ fontWeight: 600 }}>{d.count}</span>
                </div>
              ))}
            </Card>
            <Card size="small" title="用户等级分布" style={{ marginTop: 12 }}>
              {(distribution?.levelDist || []).map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>{d.level}</span><span style={{ fontWeight: 600 }}>{d.count}</span>
                </div>
              ))}
            </Card>
            <Card size="small" title="价格区间分布" style={{ marginTop: 12 }}>
              {(distribution?.priceDist || []).map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>{d.price_range}</span><span style={{ fontWeight: 600 }}>{d.count}</span>
                </div>
              ))}
            </Card>
          </Card>
        </Col>
      </Row>
    </div>
  );
}