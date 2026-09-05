import { createRouter, createWebHashHistory } from 'vue-router';
import { getAdminToken } from '../api/client';

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/',
    component: () => import('../components/AppLayout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'dashboard', component: () => import('../views/DashboardView.vue'), meta: { title: '仪表盘' } },
      { path: 'stats', name: 'stats', component: () => import('../views/StatsView.vue'), meta: { title: '数据统计' } },
      { path: 'finance', name: 'finance', component: () => import('../views/FinanceView.vue'), meta: { title: '财务看板' } },
      { path: 'opportunities', name: 'opportunities', component: () => import('../views/OpportunitiesView.vue'), meta: { title: '商机管理' } },
      { path: 'opportunities/import', name: 'opp-import', component: () => import('../views/OpportunityImportView.vue'), meta: { title: '批量导入' } },
      { path: 'users', name: 'users', component: () => import('../views/UsersView.vue'), meta: { title: '用户管理' } },
      { path: 'orders', name: 'orders', component: () => import('../views/OrdersView.vue'), meta: { title: '订单管理' } },
      { path: 'points', name: 'points', component: () => import('../views/PointsView.vue'), meta: { title: '积分流水' } },
      { path: 'recharge', name: 'recharge', component: () => import('../views/RechargeView.vue'), meta: { title: '充值对账' } },
      { path: 'audit', name: 'audit', component: () => import('../views/AuditView.vue'), meta: { title: '进度审核' } },
      { path: 'levels', name: 'levels', component: () => import('../views/LevelsView.vue'), meta: { title: '等级配置' } },
      { path: 'configs', name: 'configs', component: () => import('../views/ConfigsView.vue'), meta: { title: '系统配置' } },
      { path: 'agreements', name: 'agreements', component: () => import('../views/AgreementsView.vue'), meta: { title: '协议内容' } },
      { path: 'roles', name: 'roles', component: () => import('../views/RolesView.vue'), meta: { title: '角色权限' } },
      { path: 'admins', name: 'admins', component: () => import('../views/AdminsView.vue'), meta: { title: '管理员' } },
      { path: 'audit-logs', name: 'audit-logs', component: () => import('../views/AuditLogsView.vue'), meta: { title: '操作日志' } },
      { path: 'announcements', name: 'announcements', component: () => import('../views/AnnouncementsView.vue'), meta: { title: '公告管理' } },
      { path: 'banners', name: 'banners', component: () => import('../views/BannersView.vue'), meta: { title: 'Banner 管理' } },
      { path: 'notifications', name: 'notifications', component: () => import('../views/NotificationsView.vue'), meta: { title: '通知推送' } },
      { path: 'categories', name: 'categories', component: () => import('../views/CategoriesView.vue'), meta: { title: '分类管理' } },
      { path: 'tags', name: 'tags', component: () => import('../views/TagsView.vue'), meta: { title: '标签管理' } },
    ],
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach((to) => {
  if (to.meta.public) return true;
  if (!getAdminToken()) return { name: 'login' };
  return true;
});

router.afterEach((to) => {
  const title = to.meta.title ? `${to.meta.title} · HOF 管理后台` : 'HOF 管理后台';
  document.title = title;
});

export default router;
