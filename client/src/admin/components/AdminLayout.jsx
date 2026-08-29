import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Space, Typography } from 'antd';
import {
  DashboardOutlined, FileTextOutlined, UserOutlined, OrderedListOutlined,
  CreditCardOutlined, SettingOutlined, AuditOutlined, LogoutOutlined,
  SafetyCertificateOutlined, FileSearchOutlined, LineChartOutlined, UploadOutlined,
  SoundOutlined, PictureOutlined, BellOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/opportunities', icon: <FileTextOutlined />, label: '商机管理' },
  { key: '/opportunities/import', icon: <UploadOutlined />, label: '批量导入' },
  { key: '/users', icon: <UserOutlined />, label: '用户管理' },
  { key: '/orders', icon: <OrderedListOutlined />, label: '订单管理' },
  { key: '/points', icon: <CreditCardOutlined />, label: '积分管理' },
  { key: '/audit', icon: <AuditOutlined />, label: '进度审核' },
  { key: '/levels', icon: <SafetyCertificateOutlined />, label: '等级配置' },
  { key: '/configs', icon: <SettingOutlined />, label: '系统配置' },
  { key: '/configs/agreements', icon: <FileSearchOutlined />, label: '协议内容' },
  { key: '/stats', icon: <LineChartOutlined />, label: '数据统计' },
  { key: '/roles', icon: <SafetyCertificateOutlined />, label: '角色管理' },
  { key: '/audit-logs', icon: <FileSearchOutlined />, label: '操作日志' },
  { key: '/announcements', icon: <SoundOutlined />, label: '公告管理' },
  { key: '/banners', icon: <PictureOutlined />, label: 'Banner管理' },
  { key: '/notifications', icon: <BellOutlined />, label: '通知推送' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/login');
  };

  const userMenuItems = [
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider>
        <div style={{ height: 32, margin: 16, textAlign: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>商机管理后台</Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Dropdown menu={{ items: userMenuItems }}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <Text>管理员</Text>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8, minHeight: 'calc(100vh - 112px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}