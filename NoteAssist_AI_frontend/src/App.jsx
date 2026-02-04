// FILE: src/App.jsx
// ============================================================================

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './store';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotesPage from './pages/NotesPage';
import ProfilePage from './pages/ProfilePage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from '@/pages/User_DashboardPage';

// AI Tools Pages
import AIToolsPage from './pages/AIToolsPage';
import GenerateTopicPage from './pages/GenerateTopicPage';
import ImproveTopicPage from './pages/ImproveTopicPage';
import SummarizeTopicPage from './pages/SummarizeTopicPage';
import CodeGeneratorPage from './pages/CodeGeneratorPage';
import AIHistoryPage from './pages/AIHistoryPage';

// Admin Pages
import AdminDashboard from '@/pages/Admin_Dashboard';
import AdminAIAnalyticsPage from './pages/AdminAIAnalyticsPage';

// Guards
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import GuestRoute from '@/components/guards/GuestRoute';
import AdminRoute from '@/components/guards/AdminRoute';
import { useEffect } from 'react';

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
        <Toaster position="top-right" />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={
            <GuestRoute>
              <HomePage />
            </GuestRoute>
          } />
          
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

          {/* Notes */}
          <Route path="/notes" element={
            <ProtectedRoute>
              <NotesPage />
            </ProtectedRoute>
          } />

          {/* AI Tools Routes */}
          <Route path="/ai-tools" element={
            <ProtectedRoute>
              <AIToolsPage />
            </ProtectedRoute>
          } />
          
          <Route path="/ai-tools/generate" element={
            <ProtectedRoute>
              <GenerateTopicPage />
            </ProtectedRoute>
          } />
          
          <Route path="/ai-tools/improve" element={
            <ProtectedRoute>
              <ImproveTopicPage />
            </ProtectedRoute>
          } />
          
          <Route path="/ai-tools/summarize" element={
            <ProtectedRoute>
              <SummarizeTopicPage />
            </ProtectedRoute>
          } />
          
          <Route path="/ai-tools/code" element={
            <ProtectedRoute>
              <CodeGeneratorPage />
            </ProtectedRoute>
          } />
          
          <Route path="/ai-tools/history" element={
            <ProtectedRoute>
              <AIHistoryPage />
            </ProtectedRoute>
          } />

          {/* Profile */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          
          <Route path="/admin/analytics" element={
            <AdminRoute>
              <AdminAIAnalyticsPage />
            </AdminRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </Provider>
  );
}

export default App;