// FILE: src/App.jsx
// ============================================================================

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { lazy, Suspense, useEffect } from 'react';

// ⚡ PERFORMANCE: Toast notification system
import ToastContainer from './components/common/Toast';

// Main Pages (loaded immediately for faster initial load)
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotesPage from './pages/NotesPage';
import DashboardPage from '@/pages/User_DashboardPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Static Pages (loaded immediately)
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

// Guards (loaded immediately)
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import GuestRoute from '@/components/guards/GuestRoute';
import AdminRoute from '@/components/guards/AdminRoute';

// Lazy-loaded Pages (code splitting for better performance)
// Profile & AI Tools - loaded on demand
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AIToolsPage = lazy(() => import('./pages/AIToolsPage'));
const AIToolsGenerateTopicPage = lazy(() => import('./pages/AIToolsGenerateTopicPage'));
const AIToolsImprovePage = lazy(() => import('./pages/AIToolsImprovePage'));
const AIToolsSummarizePage = lazy(() => import('./pages/AIToolsSummarizePage'));
const AIToolsGenerateCodePage = lazy(() => import('./pages/AIToolsGenerateCodePage'));
const AIHistoryPage = lazy(() => import('./pages/AIHistoryPage'));

// Admin Pages - lazy loaded (accessed less frequently)
const AdminDashboard = lazy(() => import('@/pages/Admin_Dashboard'));
const AdminAIAnalyticsPage = lazy(() => import('./pages/AdminAIAnalyticsPage'));
const AdminUserManagementPage = lazy(() => import('./pages/AdminUserManagementPage'));
const AdminUserDetailPage = lazy(() => import('./pages/AdminUserDetailPage'));

// Loading component for lazy-loaded routes
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
  </div>
);

function App() {
  useEffect(() => {
    // Log current auth state for debugging
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    console.log('[App] Auth State:', {
      hasToken: !!token,
      hasUser: !!userStr,
      user: userStr ? JSON.parse(userStr) : null
    });
  }, []);

  return (
    <Provider store={store}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {/* ⚡ Global Toast Notification System */}
        <ToastContainer maxToasts={5} />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={
              <GuestRoute>
                <HomePage />
              </GuestRoute>
            } />

            <Route path="/home" element={<HomePage />} />
            
            <Route path="/login" element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            } />
            
            <Route path="/register" element={
              <GuestRoute>
                <RegisterPage />
              </GuestRoute>
            } />
            
            {/* Password Reset Routes */}
            <Route path="/forgot-password" element={
              <GuestRoute>
                <ForgotPasswordPage />
              </GuestRoute>
            } />
            
            <Route path="/reset-password" element={
              <GuestRoute>
                <ResetPasswordPage />
              </GuestRoute>
            } />

            {/* Static Pages */}
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />

            {/* User Dashboard */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />

            {/* Notes - Allow guest access */}
            <Route path="/notes" element={
              <ProtectedRoute allowGuest={true}>
                <NotesPage />
              </ProtectedRoute>
            } />

            {/* AI Tools Routes - Allow guest access */}
            <Route path="/ai-tools" element={
              <ProtectedRoute allowGuest={true}>
                <AIToolsPage />
              </ProtectedRoute>
            } />
            
            <Route path="/ai-tools/generate" element={
              <ProtectedRoute allowGuest={true}>
                <AIToolsGenerateTopicPage />
              </ProtectedRoute>
            } />
            
            <Route path="/ai-tools/improve" element={
              <ProtectedRoute allowGuest={true}>
                <AIToolsImprovePage />
              </ProtectedRoute>
            } />
            
            <Route path="/ai-tools/summarize" element={
              <ProtectedRoute allowGuest={true}>
                <AIToolsSummarizePage />
              </ProtectedRoute>
            } />
            
            <Route path="/ai-tools/code" element={
              <ProtectedRoute allowGuest={true}>
                <AIToolsGenerateCodePage />
              </ProtectedRoute>
            } />
            
            <Route path="/ai-tools/history" element={
              <ProtectedRoute>
                <AIHistoryPage />
              </ProtectedRoute>
            } />

            {/* Profile - Lazy Loaded */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />

            {/* ================================================================
                ADMIN ROUTES - All lazy loaded, require admin permissions
                ================================================================ */}

            {/* Admin Dashboard */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            
            {/* Admin AI Analytics */}
            <Route path="/admin/analytics" element={
              <AdminRoute>
                <AdminAIAnalyticsPage />
              </AdminRoute>
            } />

            {/* Admin User Management - Lists all users with insights */}
            <Route path="/admin/users" element={
              <AdminRoute>
                <AdminUserManagementPage />
              </AdminRoute>
            } />

            {/* Admin User Detail - Single user deep-dive */}
            <Route path="/admin/users/:userId" element={
              <AdminRoute>
                <AdminUserDetailPage />
              </AdminRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </Provider>
  );
}

export default App;