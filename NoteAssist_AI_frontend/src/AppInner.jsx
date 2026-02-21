// FILE: src/AppInner.jsx
// ============================================================================
// Inner App Component - Runs INSIDE Redux Provider
// This component has access to Redux context
// ============================================================================

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// ⚡ CRITICAL: Auth Hydration Hook - Now safe to use (inside Provider)
import { useAuthHydration } from '@/hooks/useAuthHydration';

// ⚡ PERFORMANCE: Toast notification system
import ToastContainer from './components/common/Toast';
import { Toaster } from 'react-hot-toast';

// Main Pages (loaded immediately for faster initial load)
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Lazy-load heavier pages to improve initial bundle
const NotesPage = lazy(() => import('./pages/NotesPage'));
const DashboardPage = lazy(() => import('@/pages/User_DashboardPage'));

// Static Pages (loaded immediately)
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

// Guards (loaded immediately)
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import GuestRoute from '@/components/guards/GuestRoute';
import AdminRoute from '@/components/guards/AdminRoute';
import PublicPageRoute from '@/components/guards/PublicPageRoute';

// Layouts
import MainLayout from '@/components/layout/MainLayout';

// Lazy-loaded Pages (code splitting for better performance)
// Profile & AI Tools - loaded on demand
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AIToolsPage = lazy(() => import('./pages/AIToolsPage'));
const AIToolsGenerateTopicPage = lazy(() => import('./pages/AIToolsGenerateTopicPage'));
const AIToolsImprovePage = lazy(() => import('./pages/AIToolsImprovePage'));
const AIToolsSummarizePage = lazy(() => import('./pages/AIToolsSummarizePage'));
const AIToolsGenerateCodePage = lazy(() => import('./pages/AIToolsGenerateCodePage'));
const AIHistoryPage = lazy(() => import('./pages/AIHistoryPage'));

// Public Tools - accessible without authentication
const OnlineCodeRunnerPage = lazy(() => import('./pages/OnlineCodeRunnerPage'));
const ManualNoteEditorPage = lazy(() => import('./pages/ManualNoteEditorPage'));

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

function AppInner() {
  // ✅ NOW SAFE: useAuthHydration can access Redux (we're inside Provider)
  // Hydrate Redux auth state from localStorage on app mount
  // This ensures Navbar immediately shows after login without refresh
  useAuthHydration();

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {/* ⚡ Global Toast Notification System */}
      <ToastContainer maxToasts={5} />
      <Toaster position="top-right" />
      
      {/* ✅ Main Layout - Provides Navbar + Content Area */}
      <MainLayout>
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

            {/* Notes - Public page (viewable without auth, but actions require auth) */}
            <Route path="/notes" element={
              <PublicPageRoute>
                <NotesPage />
              </PublicPageRoute>
            } />

            {/* AI Tools Routes - Public pages (viewable without auth, but actions require auth) */}
            <Route path="/ai-tools" element={
              <PublicPageRoute>
                <AIToolsPage />
              </PublicPageRoute>
            } />
            
            <Route path="/ai-tools/generate" element={
              <PublicPageRoute>
                <AIToolsGenerateTopicPage />
              </PublicPageRoute>
            } />
            
            <Route path="/ai-tools/improve" element={
              <PublicPageRoute>
                <AIToolsImprovePage />
              </PublicPageRoute>
            } />
            
            <Route path="/ai-tools/summarize" element={
              <PublicPageRoute>
                <AIToolsSummarizePage />
              </PublicPageRoute>
            } />
            
            <Route path="/ai-tools/code" element={
              <PublicPageRoute>
                <AIToolsGenerateCodePage />
              </PublicPageRoute>
            } />
            
            <Route path="/ai-tools/history" element={
              <ProtectedRoute>
                <AIHistoryPage />
              </ProtectedRoute>
            } />

            {/* Public Tools - Accessible without authentication */}
            <Route path="/code-runner" element={
              <PublicPageRoute>
                <OnlineCodeRunnerPage />
              </PublicPageRoute>
            } />
            
            <Route path="/note-editor" element={
              <PublicPageRoute>
                <ManualNoteEditorPage />
              </PublicPageRoute>
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
      </MainLayout>
    </Router>
  );
}

export default AppInner;
