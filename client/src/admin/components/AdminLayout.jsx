import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Space, Typography } from 'antd';
import {
  DashboardOutlined, FileTextOutlined, UserOutlined, OrderedListOutlined,
  CreditCardOutlined, SettingOutlined, AuditOutlined, LogoutOutlined,
  SafetyCertificateOutlined, FileSearchOutlined, LineChartOutlined, UploadOutlined,
  SoundOutlined, PictureOutlined, BellOutlined, AccountBookOutlined,
  TeamOutlined, PayCircleOutlined, AppstoreOutlined, TagsOutlined
} from '@ant-design/icons';
import { adminApi } from '../../admin/api';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// 角色中文名
const ROLE_LABEL = {
  super_admin: '超级管理员',
  operation: '运营管理员',
  finance: '财务管理员',
  support: '客服/助理',
};

// 菜单可见角色：与 server/index.js 的 requireRole 路由映射保持一致
const ALL_ROLES = ['super_admin', 'operation', 'finance', 'support'];
const SUPER = ['super_admin'];
const OP = ['operation', 'super_admin'];
const FIN = ['finance', 'super_admin'];
const STATS = ['operation', 'finance', 'super_admin'];

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘', roles: STATS },
  { key: '/opportunities', icon: <FileTextOutlined />, label: '商机管理', roles: OP },
  { key: '/opportunities/import', icon: <UploadOutlined />, label: '批量导入', roles: OP },
  { key: '/users', icon: <UserOutlined />, label: '用户管理', roles: OP },
  { key: '/orders', icon: <OrderedListOutlined />, label: '订单管理', roles: FIN },
  { key: '/points', icon: <CreditCardOutlined />, label: '积分管理', roles: FIN },
  { key: '/recharge-orders', icon: <AccountBookOutlined />, label: '充值对账', roles: FIN },
  { key: '/audit', icon: <AuditOutlined />, label: '进度审核', roles: OP },
  { key: '/levels', icon: <SafetyCertificateOutlined />, label: '等级配置', roles: SUPER },
  { key: '/configs', icon: <SettingOutlined />, label: '系统配置', roles: SUPER },
  { key: '/configs/agreements', icon: <FileSearchOutlined />, label: '协议内容', roles: SUPER },
  { key: '/stats', icon: <LineChartOutlined />, label: '数据统计', roles: STATS },
  { key: '/roles', icon: <SafetyCertificateOutlined />, label: '角色管理', roles: SUPER },
  { key: '/audit-logs', icon: <FileSearchOutlined />, label: '操作日志', roles: SUPER },
  { key: '/announcements', icon: <SoundOutlined />, label: '公告管理', roles: OP },
  { key: '/banners', icon: <PictureOutlined />, label: 'Banner管理', roles: OP },
  { key: '/notifications', icon: <BellOutlined />, label: '通知推送', roles: OP },
  { key: '/admins', icon: <TeamOutlined />, label: '管理员管理', roles: SUPER },
  { key: '/finance', icon: <PayCircleOutlined />, label: '财务看板', roles: FIN },
  { key: '/categories', icon: <AppstoreOutlined />, label: '分类管理', roles: OP },
  { key: '/tags', icon: <TagsOutlined />, label: '标签管理', roles: OP },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [me, setMe] = useState(null);

  useEffect(() => {
    // 登录后获取当前管理员姓名与角色；失败时降级展示全部菜单
    adminApi
      .getMe()
      .then((data) => setMe(data))
      .catch(() => setMe(null));
  }, []);

  const myRoles = Array.isArray(me?.roles) && me.roles.length > 0 ? me.roles : ALL_ROLES;
  const visibleMenuItems = menuItems.filter((item) => item.roles.some((r) => myRoles.includes(r)));

  const handleLogout = async () => {
    // 服务端吊销管理 token（按 jti）；失败也继续本地清理
    try {
      await adminApi.adminLogout();
    } catch {
      // token 已过期或网络异常：本地清理即可
    }
    localStorage.removeItem('admin_token');
    navigate('/login');
  };

  const userMenuItems = [
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
  ];

  const roleLabel = (me?.roles || []).map((r) => ROLE_LABEL[r] || r).join(' / ') || '管理员';

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
          items={visibleMenuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Dropdown menu={{ items: userMenuItems }}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <Text>{me?.name || me?.username || '管理员'}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>{roleLabel}</Text>
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
