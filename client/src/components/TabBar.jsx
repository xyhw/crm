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

// 不显示底部导航的页面（登录/注册/找回密码）
const HIDDEN_PATHS = ['/login', '/register', '/forgot-password'];

// 二级页面路径 -> 所属主 tab 高亮
const ACTIVE_ALIAS = {
  '/my-opportunities': '/profile',
  '/my/orders': '/profile',
  '/points': '/profile',
  '/points/flow': '/profile',
  '/points/result': '/profile',
  '/member-level': '/profile',
  '/credit': '/profile',
  '/invite': '/profile',
  '/profile/edit': '/profile',
  '/profile/change-password': '/profile',
  '/notifications': '/profile',
  '/reminders': '/profile',
  '/ranking': '/profile',
  '/support': '/profile',
};

function resolveActivePath(pathname) {
  if (ACTIVE_ALIAS[pathname]) return ACTIVE_ALIAS[pathname];
  if (pathname.startsWith('/opportunities')) return '/opportunities';
  if (pathname.startsWith('/crm')) return '/crm';
  if (pathname.startsWith('/publish')) return '/publish';
  if (pathname.startsWith('/announcement') || pathname.startsWith('/agreement')) return '/';
  return pathname;
}

/**
 * 底部导航常驻所有用户页面：
 * - 登录/注册/找回密码页隐藏
 * - 其余页面始终显示，避免充值、订单等二级流程走完后无法回到首页
 */
export default function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  if (HIDDEN_PATHS.includes(location.pathname)) return null;

  return (
    <>
      {/* 占位，避免固定定位的 Tabbar 遮挡页面底部内容 */}
      <div style={{ height: 50 }} aria-hidden />
      <Tabbar
        value={resolveActivePath(location.pathname)}
        onChange={(path) => navigate(path)}
        safeAreaInsetBottom
      >
        {TABS.map((tab) => (
          <Tabbar.Item key={tab.path} name={tab.path} icon={tab.icon}>
            {tab.name}
          </Tabbar.Item>
        ))}
      </Tabbar>
    </>
  );
}
