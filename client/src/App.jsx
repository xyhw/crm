import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import TabBar from './components/TabBar';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Home = lazy(() => import('./pages/Home'));
const Hall = lazy(() => import('./pages/Hall'));
const OpportunityDetail = lazy(() => import('./pages/OpportunityDetail'));
const Publish = lazy(() => import('./pages/Publish'));
const Profile = lazy(() => import('./pages/Profile'));
const ProfileEdit = lazy(() => import('./pages/ProfileEdit'));
const MyOrders = lazy(() => import('./pages/MyOrders'));
const Points = lazy(() => import('./pages/Points'));
const PointsFlow = lazy(() => import('./pages/PointsFlow'));
const CRM = lazy(() => import('./pages/CRM'));
const CRMDetail = lazy(() => import('./pages/CRMDetail'));
const MemberLevel = lazy(() => import('./pages/MemberLevel'));
const Credit = lazy(() => import('./pages/Credit'));
const Invite = lazy(() => import('./pages/Invite'));
const Ranking = lazy(() => import('./pages/Ranking'));
const Notifications = lazy(() => import('./pages/Notifications'));
const ReminderCenter = lazy(() => import('./pages/ReminderCenter'));
const Agreement = lazy(() => import('./pages/Agreement'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Support = lazy(() => import('./pages/Support'));
const NotFound = lazy(() => import('./pages/NotFound'));

const PageLoading = () => (
  <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>加载中...</div>
);

function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/login" element={<Suspense fallback={<PageLoading />}><Login /></Suspense>} />
        <Route path="/register" element={<Suspense fallback={<PageLoading />}><Register /></Suspense>} />
        <Route path="/forgot-password" element={<Suspense fallback={<PageLoading />}><ForgotPassword /></Suspense>} />
        <Route path="/" element={<RequireAuth><Suspense fallback={<PageLoading />}><Home /></Suspense></RequireAuth>} />
        <Route path="/opportunities" element={<RequireAuth><Suspense fallback={<PageLoading />}><Hall /></Suspense></RequireAuth>} />
        <Route path="/opportunity/:id" element={<RequireAuth><Suspense fallback={<PageLoading />}><OpportunityDetail /></Suspense></RequireAuth>} />
        <Route path="/publish" element={<RequireAuth><Suspense fallback={<PageLoading />}><Publish /></Suspense></RequireAuth>} />
        <Route path="/crm" element={<RequireAuth><Suspense fallback={<PageLoading />}><CRM /></Suspense></RequireAuth>} />
        <Route path="/crm/:id" element={<RequireAuth><Suspense fallback={<PageLoading />}><CRMDetail /></Suspense></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Suspense fallback={<PageLoading />}><Profile /></Suspense></RequireAuth>} />
        <Route path="/profile/edit" element={<RequireAuth><Suspense fallback={<PageLoading />}><ProfileEdit /></Suspense></RequireAuth>} />
        <Route path="/my/orders" element={<RequireAuth><Suspense fallback={<PageLoading />}><MyOrders /></Suspense></RequireAuth>} />
        <Route path="/points" element={<RequireAuth><Suspense fallback={<PageLoading />}><Points /></Suspense></RequireAuth>} />
        <Route path="/points/flow" element={<RequireAuth><Suspense fallback={<PageLoading />}><PointsFlow /></Suspense></RequireAuth>} />
        <Route path="/member-level" element={<RequireAuth><Suspense fallback={<PageLoading />}><MemberLevel /></Suspense></RequireAuth>} />
        <Route path="/credit" element={<RequireAuth><Suspense fallback={<PageLoading />}><Credit /></Suspense></RequireAuth>} />
        <Route path="/invite" element={<RequireAuth><Suspense fallback={<PageLoading />}><Invite /></Suspense></RequireAuth>} />
        <Route path="/ranking" element={<RequireAuth><Suspense fallback={<PageLoading />}><Ranking /></Suspense></RequireAuth>} />
        <Route path="/notifications" element={<RequireAuth><Suspense fallback={<PageLoading />}><Notifications /></Suspense></RequireAuth>} />
        <Route path="/reminders" element={<RequireAuth><Suspense fallback={<PageLoading />}><ReminderCenter /></Suspense></RequireAuth>} />
        <Route path="/agreement/:type" element={<Suspense fallback={<PageLoading />}><Agreement /></Suspense>} />
        <Route path="*" element={<Suspense fallback={<PageLoading />}><NotFound /></Suspense>} />
        <Route path="/support" element={<Suspense fallback={<PageLoading />}><Support /></Suspense>} />
      </Routes>
      <TabBar />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}