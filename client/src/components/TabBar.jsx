import { useNavigate, useLocation } from 'react-router-dom';
import { Tabbar } from 'react-vant';

const TABS = [
  { path: '/', icon: 'wap-home-o', name: '首页' },
  { path: '/opportunities', icon: 'search', name: '大厅' },
  { path: '/publish', icon: 'edit', name: '发布' },
  { path: '/crm', icon: 'contact', name: 'CRM' },
  { path: '/profile', icon: 'user-o', name: '我的' },
];

export default function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isTabPath = TABS.some((t) => t.path === location.pathname);
  if (!isTabPath) return null;

  return (
    <Tabbar
      value={location.pathname}
      onChange={(path) => navigate(path)}
      safeAreaInsetBottom
    >
      {TABS.map((tab) => (
        <Tabbar.Item key={tab.path} name={tab.path} icon={tab.icon}>
          {tab.name}
        </Tabbar.Item>
      ))}
    </Tabbar>
  );
}
