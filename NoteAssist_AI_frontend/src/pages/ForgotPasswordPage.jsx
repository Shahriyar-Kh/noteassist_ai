/**
 * ForgotPasswordPage - Password Reset Request
 * 
 * Features:
 * - Email input with validation (red border on error)
 * - Two-step UX (request → confirmation)
 * - Design system integration
 * - Loading states with spinner
 * - Mobile-first responsive design
 * - Smooth animations
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Mail, ArrowLeft, BookOpen, CheckCircle, AlertCircle, Inbox, Loader2 } from 'lucide-react';
import { Button, Card, PageContainer } from '@/components/design-system';
import { useFormValidation, validators } from '@/hooks/useFormValidation';
import { API_BASE_URL } from '@/utils/constants';
import { sanitizeString } from '@/utils/validation';
import logger from '@/utils/logger';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { 
    values, 
    errors, 
    touched,
    handleSubmit: handleValidation,
    getFieldProps,
  } = useFormValidation(
    { email: '' },
    async (data) => {
      setAuthError('');
      setIsSubmitting(true);

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/request_password_reset/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ email: sanitizeString(data.email || '').toLowerCase() }),
        });

        const responseData = await response.json();

        if (response.ok) {
          setSubmittedEmail(sanitizeString(data.email || '').toLowerCase());
          setEmailSent(true);
        } else {
          setAuthError(responseData.error || 'Failed to send reset link. Please try again.');
        }
      } catch (error) {
        logger.error('[Forgot Password] Error:', String(error));
        setAuthError('Cannot connect to server. Please check your connection.');
      } finally {
        setIsSubmitting(false);
      }
    },
    {
      email: validators.email,
    }
  );

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleValidation(e);
  };

  const handleTryAnother = () => {
    setEmailSent(false);
    setSubmittedEmail('');
    setAuthError('');
  };

  return (
    <>
      <Helmet>
        <title>Reset Password | NoteAssist AI</title>
        <meta name="description" content="Reset your NoteAssist AI password and regain access to your account." />
        <meta name="keywords" content="forgot password, reset password, account recovery" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <PageContainer center minHeight bgGradient>
        <div className="w-full max-w-md mx-auto px-4 sm:px-0">
          {/* Back Button */}
          <button
            onClick={() => navigate('/login')}
            className="mb-4 sm:mb-6 flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium transition-colors text-sm sm:text-base active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            Back to Login
          </button>

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
                Reset Your Password
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                {emailSent
                  ? "We've sent you a reset link"
                  : "Enter your email and we'll send you instructions"}
              </p>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-error-50 border border-error-200 rounded-lg flex items-start sm:items-center gap-2 sm:gap-3 animate-fade-in-up">
                <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                <p className="text-error-800 font-medium text-xs sm:text-sm">{authError}</p>
              </div>
            )}

            {!emailSent ? (
              // Email Request Form
              <form onSubmit={handleFormSubmit} className="space-y-4 sm:space-y-6">
                {/* Email Input */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-error-600">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      {...getFieldProps('email')}
                      placeholder="your@email.com"
                      disabled={isSubmitting}
                      className={`w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border-2 rounded-xl text-sm sm:text-base transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                        touched.email && errors.email 
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' 
                          : 'border-gray-200 hover:border-gray-300 focus:border-primary-500 focus:ring-primary-500/20'
                      } disabled:bg-gray-50 disabled:cursor-not-allowed`}
                    />
                  </div>
                  {touched.email && errors.email && (
                    <p className="text-red-500 text-xs sm:text-sm mt-1.5 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      {errors.email}
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
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Reset Link
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                    </>
                  )}
                </Button>

                <p className="text-center text-xs sm:text-sm text-gray-600">
                  Remember your password?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="text-primary-600 hover:text-primary-700 font-semibold"
                    disabled={isSubmitting}
                  >
                    Sign in
                  </button>
                </p>
              </form>
            ) : (
              // Success State
              <div className="space-y-4 sm:space-y-6 animate-fade-in-up">
                {/* Success Icon */}
                <div className="flex justify-center">
                  <div className="p-3 sm:p-4 bg-success-100 rounded-full">
                    <Inbox className="w-6 h-6 sm:w-8 sm:h-8 text-success-600" />
                  </div>
                </div>

                {/* Success Message */}
                <div className="bg-success-50 border border-success-200 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-success-800 text-center">
                    Check your email at <strong className="font-semibold break-all">{submittedEmail}</strong> for a link to reset your password.
                  </p>
                  <p className="text-xs text-success-700 text-center mt-2">
                    If it doesn't appear within 5 minutes, check your spam folder.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 sm:space-y-3">
                  <Button
                    variant="outline"
                    size="lg"
                    fullWidth
                    onClick={handleTryAnother}
                    className="text-sm sm:text-base py-2.5 sm:py-3"
                  >
                    Try Another Email
                  </Button>

                  <Button
                    variant="ghost"
                    size="lg"
                    fullWidth
                    onClick={() => navigate('/login')}
                    className="text-sm sm:text-base py-2.5 sm:py-3"
                  >
                    Back to Login
                  </Button>
                </div>

                {/* Help Text */}
                <p className="text-center text-xs text-gray-500">
                  Need help?{' '}
                  <button 
                    onClick={() => window.open('/contact', '_blank')}
                    className="text-primary-600 hover:text-primary-700 underline"
                  >
                    Contact Support
                  </button>
                </p>
              </div>
            )}
          </Card>

          {/* Footer Links */}
          <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-600">
            <p>
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-primary-600 hover:text-primary-700 font-semibold"
              >
                Sign up for free
              </button>
            </p>
          </div>
        </div>
      </PageContainer>
    </>
  );
}