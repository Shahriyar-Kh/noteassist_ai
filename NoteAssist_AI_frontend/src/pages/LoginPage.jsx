// FILE: src/pages/LoginPage.jsx - Production-Ready Redesign
// Complete SaaS-level authentication UI with animations, validation, and SEO
// ============================================================================

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, BookOpen, ArrowRight, Shield, CheckCircle, AlertCircle, Sparkles, ArrowLeft } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { API_BASE_URL } from '@/utils/constants';
import { Button, FormInput, PageContainer, Card } from '@/components/design-system';
import { useFormValidation, validators } from '@/hooks/useFormValidation';

const LoginPage = () => {
  const navigate = useNavigate();
  const [googleInitialized, setGoogleInitialized] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Form validation rules
  const validationRules = {
    email: (value) => validators.email(value),
    password: (value) => validators.password(value, 6),
  };

  const {
    values: formData,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit: validateAndSubmit,
    getFieldProps,
    setFieldError,
  } = useFormValidation(
    { email: '', password: '' },
    handleLogin,
    validationRules
  );

  // Initialize Google OAuth
  useEffect(() => {
    const initGoogleOAuth = () => {
      if (window.google?.accounts?.id) {
        const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;

        if (!clientId || clientId === 'your-google-client-id.apps.googleusercontent.com') {
          console.warn('[Google OAuth] Client ID not configured');
          return;
        }

        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
            context: 'signin',
            ux_mode: 'popup',
          });

          const buttonDiv = document.getElementById('google-signin-button');
          if (buttonDiv?.children.length === 0) {
            window.google.accounts.id.renderButton(buttonDiv, {
              theme: 'outline',
              size: 'large',
              text: 'continue_with',
              shape: 'pill',
              logo_alignment: 'center',
            });
            setGoogleInitialized(true);
          }
        } catch (error) {
          console.error('[Google OAuth] Error:', error);
        }
      }
    };

    if (!document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => initGoogleOAuth();
      document.body.appendChild(script);
    } else {
      initGoogleOAuth();
    }
  }, []);

  // Google OAuth Handler
  const handleGoogleResponse = async (response) => {
    try {
      setGoogleLoading(true);
      setSubmitError('');

      if (!response.credential) {
        throw new Error('No credential received from Google');
      }

      const res = await fetch(`${API_BASE_URL}/api/auth/google_auth/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.detail || 'Google authentication failed. Please try again.'
        );
      }

      if (data.tokens) {
        localStorage.setItem('accessToken', data.tokens.access);
        localStorage.setItem('token', data.tokens.access);
        localStorage.setItem('refreshToken', data.tokens.refresh);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      setTimeout(() => {
        navigate(data.redirect || '/dashboard');
      }, 500);
    } catch (error) {
      console.error('[Google OAuth] Error:', error);
      setSubmitError(error.message || 'Google authentication failed. Please try email login.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Email Login Handler
  async function handleLogin(values) {
    try {
      setSubmitError('');

      const response = await fetch(`${API_BASE_URL}/api/token/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: values.email.toLowerCase().trim(),
          password: values.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('accessToken', data.access);
        localStorage.setItem('token', data.access);
        localStorage.setItem('refreshToken', data.refresh);
        localStorage.setItem('user', JSON.stringify(data.user));

        setTimeout(() => {
          navigate(data.redirect || '/dashboard');
        }, 500);
      } else {
        const errorType = data.error_type;
        const errorDetail = data.detail;

        if (errorType === 'email_not_found') {
          setFieldError('email', errorDetail || 'Email not found. Please sign up.');
          throw new Error(errorDetail || 'Email not registered');
        } else if (errorType === 'incorrect_password') {
          setFieldError('password', errorDetail || 'Incorrect password');
          throw new Error(errorDetail || 'Incorrect password');
        } else if (errorType === 'account_blocked') {
          throw new Error(`Account blocked: ${errorDetail || 'Contact support'}`);
        } else if (errorType === 'account_disabled') {
          throw new Error('Account disabled. Please contact support.');
        } else {
          throw new Error(errorDetail || 'Login failed. Please try again.');
        }
      }
    } catch (error) {
      setSubmitError(error.message || 'Login failed. Please try again.');
      throw error;
    }
  }

  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>Sign In - NoteAssist AI</title>
        <meta name="description" content="Sign in to your NoteAssist AI account and continue your AI-powered learning journey. Secure authentication with email or Google." />
        <meta name="keywords" content="login, sign in, authentication, NoteAssist AI" />
        <meta name="robots" content="no index, follow" />
      </Helmet>

      <PageContainer bgGradient containerClassName="flex items-center justify-center pt-20 pb-16 md:pt-24 md:pb-20">
        {/* Back Button */}
        <div className="absolute top-4 left-4 md:top-6 md:left-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline font-medium">Back Home</span>
          </Link>
        </div>

        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left Side - Branding & Features (Hidden on mobile) */}
          <div className="hidden lg:flex flex-col justify-center space-y-8 p-4">
            {/* Logo */}
            <div className="flex items-center gap-3 animate-fade-in-up">
              <div className="p-3 bg-gradient-to-r from-primary-600 to-blue-600 rounded-2xl shadow-lg hover:shadow-xl hover:scale-110 transition-all">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-black text-gradient">NoteAssist AI</h1>
            </div>

            {/* Heading */}
            <div className="space-y-4" style={{ animation: 'fadeInUp 0.6s ease-out 0.2s both' }}>
              <h2 className="text-5xl font-black text-gray-900 dark:text-white leading-tight">
                Welcome Back to Your{' '}
                <span className="text-gradient">Learning Journey</span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                Continue building your skills with AI-powered study tools and intelligent learning paths.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4 pt-4" style={{ animation: 'fadeInUp 0.6s ease-out 0.4s both' }}>
              {[
                'AI-Enhanced Note Taking',
                'Personalized Learning Paths',
                'Comprehensive Analytics',
                'Secure Cloud Sync',
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-600 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-300 font-semibold text-lg">{feature}</span>
                </div>
              ))}
            </div>

            {/* Decorative Element */}
            <div className="pt-8 h-32 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-blue-500/20 rounded-3xl blur-2xl"></div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full max-w-md mx-auto animate-fade-in-up" style={{ animation: 'fadeInUp 0.6s ease-out' }}>
            <Card variant="elevated" padding={true} className="p-8 md:p-10">
              {/* Header */}
              <div className="text-center mb-8">
                {/* Mobile Logo */}
                <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
                  <div className="p-2 bg-gradient-to-r from-primary-600 to-blue-600 rounded-xl">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">NoteAssist AI</span>
                </div>

                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Sign In</h2>
                <p className="text-gray-600 dark:text-gray-400">Welcome back! Sign in to your account</p>
              </div>

              {/* Error Message */}
              {submitError && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3 animate-fade-in-up">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-red-700 dark:text-red-300 font-semibold">{submitError}</p>
                  </div>
                </div>
              )}

              {/* Google Sign In */}
              <div className="mb-6">
                <div
                  id="google-signin-button"
                  className="flex justify-center"
                  style={{ opacity: googleLoading ? 0.7 : 1 }}
                ></div>
                {!googleInitialized && (
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-3">
                    Loading Google Sign-In...
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Or continue with email
                  </span>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={validateAndSubmit} className="space-y-5">
                {/* Email Field */}
                <div>
                  <FormInput
                    {...getFieldProps('email')}
                    type="email"
                    label="Email Address"
                    placeholder="you@example.com"
                    icon={Mail}
                    error={touched.email ? errors.email : ''}
                    autoComplete="email"
                    disabled={isSubmitting || googleLoading}
                    onBlur={(e) => {
                      handleBlur(e);
                    }}
                  />
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="form-label">Password</label>
                    <Link
                      to="/forgot-password"
                      className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold transition-colors"
                    >
                      Forgot?
                    </Link>
                  </div>
                  <FormInput
                    {...getFieldProps('password')}
                    type="password"
                    placeholder="••••••••"
                    icon={Lock}
                    error={touched.password ? errors.password : ''}
                    autoComplete="current-password"
                    disabled={isSubmitting || googleLoading}
                    size="md"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={isSubmitting}
                  disabled={isSubmitting || googleLoading}
                  icon={ArrowRight}
                  iconPosition="right"
                  className="mt-6"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              {/* Security Badge */}
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Shield className="w-4 h-4" />
                <span>Secured with 256-bit encryption</span>
              </div>

              {/* Sign Up Link */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  Don't have an account?{' '}
                  <Link
                    to="/register"
                    className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-bold transition-colors"
                  >
                    Sign up for free
                  </Link>
                </p>
              </div>

              {/* Extra Info */}
              <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-center">
                <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  New here? Try our demo with guest access
                </p>
              </div>
            </Card>
          </div>
        </div>
      </PageContainer>
    </>
  );
};

export default LoginPage;