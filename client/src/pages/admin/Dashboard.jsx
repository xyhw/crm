import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Typography } from 'antd';
import { UserOutlined, FileTextOutlined, OrderedListOutlined, CreditCardOutlined } from '@ant-design/icons';
import { adminApi } from '../../admin/api';

const { Title } = Typography;

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getDashboard()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { title: '用户总数', value: stats?.totalUsers || 0, icon: <UserOutlined />, color: '#143a75' },
    { title: '商机总数', value: stats?.totalOpportunities || 0, icon: <FileTextOutlined />, color: '#148a57' },
    { title: '订单总数', value: stats?.totalOrders || 0, icon: <OrderedListOutlined />, color: '#d88006' },
    { title: '积分总量', value: stats?.totalPoints || 0, icon: <CreditCardOutlined />, color: '#d93a2b' },
  ];

  return (
    <div>
      <Title level={4}>仪表盘</Title>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {statCards.map((card, index) => (
          <Col span={6} key={index}>
            <Card>
              <Statistic
                title={card.title}
                value={card.value}
                prefix={card.icon}
                valueStyle={{ color: card.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
