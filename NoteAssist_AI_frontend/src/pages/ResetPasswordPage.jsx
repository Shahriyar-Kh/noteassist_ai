/**
 * ResetPasswordPage - Password Reset Form
 * 
 * Features:
 * - Token validation
 * - Password strength requirements with visual feedback
 * - Real-time validation with red border on error
 * - Two-step UX (form → confirmation)
 * - Design system integration
 * - Authentication data cleanup
 * - Mobile-first responsive design
 * - Loading states with spinner
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Lock, Eye, EyeOff, BookOpen, CheckCircle, AlertCircle, ArrowRight, Shield, Loader2, Check, X } from 'lucide-react';
import { Button, Card, PageContainer } from '@/components/design-system';
import { useFormValidation, validators } from '@/hooks/useFormValidation';
import { isStrongPassword, sanitizeString } from '@/utils/validation';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setAuthError('Invalid or expired reset link. Please request a new password reset.');
    }
  }, [token]);

  // Use shared password strength validator (returns boolean)
  const validatePasswordStrength = (password) => {
    if (!password) return 'Password is required';
    if (!isStrongPassword(password)) return 'Password must be at least 8 characters and include a number';
    return null;
  };

  // Password strength checker for visual feedback
  const getPasswordStrength = (password) => {
    const checks = {
      length: password?.length >= 8,
      uppercase: /[A-Z]/.test(password || ''),
      lowercase: /[a-z]/.test(password || ''),
      number: /[0-9]/.test(password || ''),
    };
    return checks;
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
      setIsSubmitting(true);

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/reset_password/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
            body: JSON.stringify({
              token: token,
              new_password: sanitizeString(data.new_password),
              new_password_confirm: sanitizeString(data.new_password_confirm),
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
        // Production: log error to monitoring service or show safe message
        setAuthError('Cannot connect to server. Please check your connection.');
      } finally {
        setIsSubmitting(false);
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

  const passwordStrength = getPasswordStrength(values.new_password);

  return (
    <>
      <Helmet>
        <title>Reset Password | NoteAssist AI</title>
        <meta name="description" content="Reset your NoteAssist AI password." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <PageContainer center minHeight bgGradient>
        <div className="w-full max-w-md mx-auto px-4 sm:px-0">
          {/* Main Card */}
          <Card 
            variant="elevated" 
            className="animate-fade-in-up !p-5 sm:!p-6 md:!p-8"
          >
            {/* Logo and Heading */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl sm:rounded-2xl">
                  <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                  NoteAssist AI
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                {resetSuccess ? 'Password Updated!' : 'Reset Your Password'}
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                {resetSuccess 
                  ? 'Your password has been successfully reset'
                  : 'Create a new secure password for your account'}
              </p>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-error-50 border border-error-200 rounded-lg flex items-start sm:items-center gap-2 sm:gap-3 animate-fade-in-up">
                <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                <p className="text-error-800 font-medium text-xs sm:text-sm">{authError}</p>
              </div>
            )}

            {/* Reset Form */}
            {!resetSuccess && tokenValid && (
              <form onSubmit={handleFormSubmit} className="space-y-4 sm:space-y-6">
                {/* Password Requirements Info - Interactive */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
                  <p className="font-semibold text-xs sm:text-sm text-gray-700 mb-2 sm:mb-3">Password must include:</p>
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    <div className={`flex items-center gap-1.5 text-xs sm:text-sm ${passwordStrength.length ? 'text-success-600' : 'text-gray-500'}`}>
                      {passwordStrength.length ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                      <span>8+ characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs sm:text-sm ${passwordStrength.uppercase ? 'text-success-600' : 'text-gray-500'}`}>
                      {passwordStrength.uppercase ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                      <span>Uppercase (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs sm:text-sm ${passwordStrength.lowercase ? 'text-success-600' : 'text-gray-500'}`}>
                      {passwordStrength.lowercase ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                      <span>Lowercase (a-z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs sm:text-sm ${passwordStrength.number ? 'text-success-600' : 'text-gray-500'}`}>
                      {passwordStrength.number ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                      <span>Number (0-9)</span>
                    </div>
                  </div>
                </div>

                {/* New Password Input */}
                <div>
                  <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-2">
                    New Password <span className="text-error-600">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <input
                      id="new_password"
                      type={showPassword ? 'text' : 'password'}
                      {...getFieldProps('new_password')}
                      placeholder="••••••••"
                      disabled={isSubmitting}
                      className={`w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-3 border-2 rounded-xl text-sm sm:text-base transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                        touched.new_password && errors.new_password 
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' 
                          : 'border-gray-200 hover:border-gray-300 focus:border-primary-500 focus:ring-primary-500/20'
                      } disabled:bg-gray-50 disabled:cursor-not-allowed`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                  </div>
                  {touched.new_password && errors.new_password && (
                    <p className="text-red-500 text-xs sm:text-sm mt-1.5 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                    <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <input
                      id="new_password_confirm"
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...getFieldProps('new_password_confirm')}
                      placeholder="••••••••"
                      disabled={isSubmitting}
                      className={`w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-3 border-2 rounded-xl text-sm sm:text-base transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                        touched.new_password_confirm && errors.new_password_confirm 
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' 
                          : 'border-gray-200 hover:border-gray-300 focus:border-primary-500 focus:ring-primary-500/20'
                      } disabled:bg-gray-50 disabled:cursor-not-allowed`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      disabled={isSubmitting}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                  </div>
                  {touched.new_password_confirm && errors.new_password_confirm && (
                    <p className="text-red-500 text-xs sm:text-sm mt-1.5 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                  disabled={isSubmitting}
                  className="text-sm sm:text-base py-2.5 sm:py-3"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-2" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      Reset Password
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                    </>
                  )}
                </Button>

                {/* Security Info */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 pt-3 sm:pt-4 border-t border-gray-200">
                  <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Secured with 256-bit SSL encryption</span>
                </div>
              </form>
            )}

            {/* Success State */}
            {resetSuccess && (
              <div className="space-y-4 sm:space-y-6 animate-fade-in-up text-center">
                {/* Success Icon */}
                <div className="flex justify-center">
                  <div className="p-3 sm:p-4 bg-success-100 rounded-full">
                    <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-success-600" />
                  </div>
                </div>

                {/* Success Message */}
                <div className="space-y-2">
                  <p className="text-gray-700 font-medium text-sm sm:text-base">
                    Your password has been successfully reset!
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    You can now sign in with your new password. Redirecting to login...
                  </p>
                </div>

                {/* Action Button */}
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleGoToLogin}
                  className="text-sm sm:text-base py-2.5 sm:py-3"
                >
                  Go to Login
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                </Button>
              </div>
            )}

            {/* Invalid Token State */}
            {!tokenValid && (
              <div className="space-y-4 sm:space-y-6 text-center">
                {/* Error Icon */}
                <div className="flex justify-center">
                  <div className="p-3 sm:p-4 bg-error-100 rounded-full">
                    <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-error-600" />
                  </div>
                </div>

                {/* Error Message */}
                <div>
                  <p className="text-gray-700 font-medium mb-2 text-sm sm:text-base">
                    Invalid or Expired Link
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    The password reset link is no longer valid. Please request a new one.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 sm:space-y-3">
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => navigate('/forgot-password')}
                    className="text-sm sm:text-base py-2.5 sm:py-3"
                  >
                    Request New Link
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    fullWidth
                    onClick={() => navigate('/login')}
                    className="text-sm sm:text-base py-2.5 sm:py-3"
                  >
                    Back to Login
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Footer Links */}
          <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-600">
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