/**
 * ResetPasswordPage - Password Reset Form
 * 
 * Features:
 * - Token validation
 * - Password strength requirements
 * - Two-step UX (form → confirmation)
 * - Design system integration
 * - Authentication data cleanup
 * - Mobile responsive
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Lock, Eye, EyeOff, BookOpen, CheckCircle, AlertCircle, ArrowRight, Shield } from 'lucide-react';
import { Button, Card, PageContainer } from '@/components/design-system';
import { useFormValidation, validators } from '@/hooks/useFormValidation';
import { API_BASE_URL } from '@/utils/constants';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [authError, setAuthError] = useState('');
  const [tokenValid, setTokenValid] = useState(!!token);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setAuthError('Invalid or expired reset link. Please request a new password reset.');
    }
  }, [token]);

  // Password strength validator
  const validatePasswordStrength = (password) => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Include at least one uppercase letter';
    if (!/[a-z]/.test(password)) return 'Include at least one lowercase letter';
    if (!/[0-9]/.test(password)) return 'Include at least one number';
    return null;
  };

  const clearAuthData = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('isAuthenticated');
    
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('isAuthenticated');
  };

  const { 
    values, 
    errors, 
    touched,
    handleSubmit: handleValidation,
    getFieldProps,
  } = useFormValidation(
    {
      new_password: '',
      new_password_confirm: '',
    },
    async (data) => {
      setAuthError('');

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/reset_password/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            token: token,
            new_password: data.new_password,
            new_password_confirm: data.new_password_confirm,
          }),
        });

        const responseData = await response.json();

        if (response.ok) {
          clearAuthData();
          setResetSuccess(true);

          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
        } else {
          setAuthError(
            responseData.error || 'Failed to reset password. The link may have expired.'
          );
        }
      } catch (error) {
        console.error('[Reset Password] Error:', error);
        setAuthError('Cannot connect to server. Please check your connection.');
      }
    },
    {
      new_password: validatePasswordStrength,
      new_password_confirm: (v) => 
        validators.match(v, values.new_password, 'Passwords'),
    }
  );

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleValidation(e);
  };

  const handleGoToLogin = () => {
    clearAuthData();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <Helmet>
        <title>Reset Password | NoteAssist AI</title>
        <meta name="description" content="Reset your NoteAssist AI password." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <PageContainer center minHeight bgGradient>
        <div className="w-full max-w-md">
          {/* Main Card */}
          <Card 
            variant="elevated" 
            className="animate-fade-in-up"
          >
            {/* Logo and Heading */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                  NoteAssist AI
                </span>
              </div>

              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                {resetSuccess ? 'Password Updated!' : 'Reset Your Password'}
              </h1>
              <p className="text-gray-600">
                {resetSuccess 
                  ? 'Your password has been successfully reset'
                  : 'Create a new secure password for your account'}
              </p>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg flex items-center gap-3 animate-fade-in-up">
                <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0" />
                <p className="text-error-800 font-medium text-sm">{authError}</p>
              </div>
            )}

            {/* Reset Form */}
            {!resetSuccess && tokenValid && (
              <form onSubmit={handleFormSubmit} className="space-y-6">
                {/* Password Requirements Info */}
                <div className="bg-info-50 border border-info-200 rounded-lg p-3 text-xs text-info-700">
                  <p className="font-semibold mb-2">Password must include:</p>
                  <ul className="space-y-1 ml-4 list-disc">
                    <li>At least 8 characters</li>
                    <li>One uppercase letter (A-Z)</li>
                    <li>One lowercase letter (a-z)</li>
                    <li>One number (0-9)</li>
                  </ul>
                </div>

                {/* New Password Input */}
                <div>
                  <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-2">
                    New Password <span className="text-error-600">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      id="new_password"
                      type={showPassword ? 'text' : 'password'}
                      {...getFieldProps('new_password')}
                      placeholder="••••••••"
                      className={`w-full pl-12 pr-12 py-3 border rounded-lg transition-all focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        touched.new_password && errors.new_password 
                          ? 'border-error-300 bg-error-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {touched.new_password && errors.new_password && (
                    <p className="text-error-600 text-sm mt-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.new_password}
                    </p>
                  )}
                </div>

                {/* Confirm Password Input */}
                <div>
                  <label htmlFor="new_password_confirm" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password <span className="text-error-600">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      id="new_password_confirm"
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...getFieldProps('new_password_confirm')}
                      placeholder="••••••••"
                      className={`w-full pl-12 pr-12 py-3 border rounded-lg transition-all focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        touched.new_password_confirm && errors.new_password_confirm 
                          ? 'border-error-300 bg-error-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {touched.new_password_confirm && errors.new_password_confirm && (
                    <p className="text-error-600 text-sm mt-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.new_password_confirm}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon={ArrowRight}
                  iconPosition="right"
                >
                  Reset Password
                </Button>

                {/* Security Info */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 pt-4 border-t border-gray-200">
                  <Shield className="w-4 h-4" />
                  <span>Secured with 256-bit SSL encryption</span>
                </div>
              </form>
            )}

            {/* Success State */}
            {resetSuccess && (
              <div className="space-y-6 animate-fade-in-up text-center">
                {/* Success Icon */}
                <div className="flex justify-center">
                  <div className="p-4 bg-success-100 rounded-full">
                    <CheckCircle className="w-8 h-8 text-success-600" />
                  </div>
                </div>

                {/* Success Message */}
                <div className="space-y-2">
                  <p className="text-gray-700 font-medium">
                    Your password has been successfully reset!
                  </p>
                  <p className="text-sm text-gray-600">
                    You can now sign in with your new password. Redirecting to login...
                  </p>
                </div>

                {/* Action Button */}
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleGoToLogin}
                  icon={ArrowRight}
                  iconPosition="right"
                >
                  Go to Login
                </Button>
              </div>
            )}

            {/* Invalid Token State */}
            {!tokenValid && (
              <div className="space-y-6 text-center">
                {/* Error Icon */}
                <div className="flex justify-center">
                  <div className="p-4 bg-error-100 rounded-full">
                    <AlertCircle className="w-8 h-8 text-error-600" />
                  </div>
                </div>

                {/* Error Message */}
                <div>
                  <p className="text-gray-700 font-medium mb-2">
                    Invalid or Expired Link
                  </p>
                  <p className="text-sm text-gray-600">
                    The password reset link is no longer valid. Please request a new one.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => navigate('/forgot-password')}
                  >
                    Request New Link
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    fullWidth
                    onClick={() => navigate('/login')}
                  >
                    Back to Login
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Footer Links */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              Need help?{' '}
              <button
                onClick={() => window.open('/contact', '_blank')}
                className="text-primary-600 hover:text-primary-700 font-semibold"
              >
                Contact Support
              </button>
            </p>
          </div>
        </div>
      </PageContainer>
    </>
  );
}