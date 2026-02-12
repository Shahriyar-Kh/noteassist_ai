/**
 * ForgotPasswordPage - Password Reset Request
 * 
 * Features:
 * - Email input with validation
 * - Two-step UX (request → confirmation)
 * - Design system integration
 * - Smooth animations
 * - Mobile responsive
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Mail, ArrowLeft, BookOpen, CheckCircle, AlertCircle, Inbox } from 'lucide-react';
import { Button, Card, FormInput, PageContainer } from '@/components/design-system';
import { useFormValidation, validators } from '@/hooks/useFormValidation';
import { API_BASE_URL } from '@/utils/constants';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [authError, setAuthError] = useState('');

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

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/request_password_reset/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ email: data.email.toLowerCase().trim() }),
        });

        const responseData = await response.json();

        if (response.ok) {
          setSubmittedEmail(data.email);
          setEmailSent(true);
        } else {
          setAuthError(responseData.error || 'Failed to send reset link. Please try again.');
        }
      } catch (error) {
        console.error('[Forgot Password] Error:', error);
        setAuthError('Cannot connect to server. Please check your connection.');
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
        <div className="w-full max-w-md">
          {/* Back Button */}
          <button
            onClick={() => navigate('/login')}
            className="mb-6 flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Login
          </button>

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
                Reset Your Password
              </h1>
              <p className="text-gray-600">
                {emailSent
                  ? "We've sent you a reset link"
                  : "Enter your email and we'll send you instructions"}
              </p>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg flex items-center gap-3 animate-fade-in-up">
                <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0" />
                <p className="text-error-800 font-medium text-sm">{authError}</p>
              </div>
            )}

            {!emailSent ? (
              // Email Request Form
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <FormInput
                  {...getFieldProps('email')}
                  label="Email Address"
                  type="email"
                  placeholder="your@email.com"
                  icon={Mail}
                  error={touched.email ? errors.email : ''}
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon={CheckCircle}
                  iconPosition="right"
                >
                  Send Reset Link
                </Button>

                <p className="text-center text-sm text-gray-600">
                  Remember your password?{' '}
                  <button
                    onClick={() => navigate('/login')}
                    className="text-primary-600 hover:text-primary-700 font-semibold"
                  >
                    Sign in
                  </button>
                </p>
              </form>
            ) : (
              // Success State
              <div className="space-y-6 animate-fade-in-up">
                {/* Success Icon */}
                <div className="flex justify-center">
                  <div className="p-4 bg-success-100 rounded-full">
                    <Inbox className="w-8 h-8 text-success-600" />
                  </div>
                </div>

                {/* Success Message */}
                <div className="bg-success-50 border border-success-200 rounded-lg p-4">
                  <p className="text-sm text-success-800 text-center">
                    Check your email at <strong className="font-semibold">{submittedEmail}</strong> for a link to reset your password.
                  </p>
                  <p className="text-xs text-success-700 text-center mt-2">
                    If it doesn't appear within 5 minutes, check your spam folder.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    size="lg"
                    fullWidth
                    onClick={handleTryAnother}
                  >
                    Try Another Email
                  </Button>

                  <Button
                    variant="ghost"
                    size="lg"
                    fullWidth
                    onClick={() => navigate('/login')}
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
        </div>
      </PageContainer>
    </>
  );
}