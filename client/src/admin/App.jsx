import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AdminLayout from '../admin/components/AdminLayout';
import Login from '../pages/admin/Login';
import Dashboard from '../pages/admin/Dashboard';

const OpportunityList = lazy(() => import('../pages/admin/OpportunityList'));
const UserList = lazy(() => import('../pages/admin/UserList'));
const OrderList = lazy(() => import('../pages/admin/OrderList'));
const PointsList = lazy(() => import('../pages/admin/PointsList'));
const LevelConfig = lazy(() => import('../pages/admin/LevelConfig'));
const SystemConfig = lazy(() => import('../pages/admin/SystemConfig'));
const AuditList = lazy(() => import('../pages/admin/AuditList'));
const RoleManagement = lazy(() => import('../pages/admin/RoleManagement'));
const AuditLogPage = lazy(() => import('../pages/admin/AuditLogPage'));
const StatsDetailed = lazy(() => import('../pages/admin/StatsDetailed'));
const OpportunityImport = lazy(() => import('../pages/admin/OpportunityImport'));
const BannerManager = lazy(() => import('../pages/admin/BannerManager'));
const NotificationManager = lazy(() => import('../pages/admin/NotificationManager'));
const AdminManage = lazy(() => import('../pages/admin/AdminManage'));
const FinanceDashboard = lazy(() => import('../pages/admin/FinanceDashboard'));
const CategoryManager = lazy(() => import('../pages/admin/CategoryManager'));
const TagManager = lazy(() => import('../pages/admin/TagManager'));

const PageLoading = () => (
  <div style={{ textAlign: 'center', padding: 120 }}>
    <Spin size="large" />
  </div>
);

function RequireAuth({ children }) {
  const token = localStorage.getItem('admin_token');
  if (!token) return <Navigate to="/admin/login" replace />;
  return children;
}

export default function AdminApp() {
  return (
    <ConfigProvider locale={zhCN}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><AdminLayout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="opportunities" element={<Suspense fallback={<PageLoading />}><OpportunityList /></Suspense>} />
          <Route path="opportunities/import" element={<Suspense fallback={<PageLoading />}><OpportunityImport /></Suspense>} />
          <Route path="users" element={<Suspense fallback={<PageLoading />}><UserList /></Suspense>} />
          <Route path="orders" element={<Suspense fallback={<PageLoading />}><OrderList /></Suspense>} />
          <Route path="points" element={<Suspense fallback={<PageLoading />}><PointsList /></Suspense>} />
          <Route path="levels" element={<Suspense fallback={<PageLoading />}><LevelConfig /></Suspense>} />
          <Route path="configs" element={<Suspense fallback={<PageLoading />}><SystemConfig /></Suspense>} />
          <Route path="audit" element={<Suspense fallback={<PageLoading />}><AuditList /></Suspense>} />
          <Route path="roles" element={<Suspense fallback={<PageLoading />}><RoleManagement /></Suspense>} />
          <Route path="audit-logs" element={<Suspense fallback={<PageLoading />}><AuditLogPage /></Suspense>} />
          <Route path="stats" element={<Suspense fallback={<PageLoading />}><StatsDetailed /></Suspense>} />
          <Route path="banners" element={<Suspense fallback={<PageLoading />}><BannerManager /></Suspense>} />
          <Route path="notifications" element={<Suspense fallback={<PageLoading />}><NotificationManager /></Suspense>} />
          <Route path="admins" element={<Suspense fallback={<PageLoading />}><AdminManage /></Suspense>} />
          <Route path="finance" element={<Suspense fallback={<PageLoading />}><FinanceDashboard /></Suspense>} />
          <Route path="categories" element={<Suspense fallback={<PageLoading />}><CategoryManager /></Suspense>} />
          <Route path="tags" element={<Suspense fallback={<PageLoading />}><TagManager /></Suspense>} />
        </Route>
      </Routes>
    </ConfigProvider>
  );
}