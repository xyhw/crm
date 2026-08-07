import { useNavigate, useLocation } from 'react-router-dom';
import { Tabbar } from 'react-vant';
import { WapHomeO, Search, Edit, Contact, UserO } from '@react-vant/icons';

const TABS = [
  { path: '/', icon: <WapHomeO width={22} height={22} />, name: '首页' },
  { path: '/opportunities', icon: <Search width={22} height={22} />, name: '大厅' },
  { path: '/publish', icon: <Edit width={22} height={22} />, name: '发布' },
  { path: '/crm', icon: <Contact width={22} height={22} />, name: 'CRM' },
  { path: '/profile', icon: <UserO width={22} height={22} />, name: '我的' },
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
