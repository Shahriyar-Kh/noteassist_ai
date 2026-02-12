/**
 * RegisterPage - SaaS-Grade User Registration
 * 
 * Features:
 * - Production-ready form with full validation
 * - Mobile-first responsive design
 * - Design system integration
 * - Smooth animations
 * - Accessibility (WCAG 2.1 AA)
 * - SEO optimized
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Mail, Lock, User, Globe, GraduationCap, BookOpen, Eye, EyeOff, CheckCircle, AlertCircle, ArrowRight, Shield, ChevronLeft } from 'lucide-react';
import { Button, Card, FormInput, PageContainer } from '@/components/design-system';
import { useFormValidation, validators } from '@/hooks/useFormValidation';
import { API_BASE_URL } from '@/utils/constants';

const EDUCATION_LEVELS = [
  { value: 'high_school', label: 'High School' },
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'graduate', label: 'Graduate' },
  { value: 'postgraduate', label: 'Postgraduate' },
  { value: 'professional', label: 'Professional' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form validation
  const { 
    values, 
    errors, 
    touched, 
    handleChange, 
    handleBlur, 
    handleSubmit: handleValidation,
    getFieldProps,
  } = useFormValidation(
    {
      email: '',
      password: '',
      password_confirm: '',
      full_name: '',
      country: '',
      education_level: 'undergraduate',
      field_of_study: '',
      terms_accepted: false,
    },
    async (data) => {
      setIsSubmitting(true);
      setAuthError('');
      setSubmitError('');

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/register/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            email: data.email.toLowerCase().trim(),
            password: data.password,
            password_confirm: data.password_confirm,
            full_name: data.full_name.trim(),
            country: data.country.trim(),
            education_level: data.education_level,
            field_of_study: data.field_of_study.trim(),
            terms_accepted: data.terms_accepted,
          }),
        });

        const responseData = await response.json();

        if (response.ok && responseData.success) {
          // Store tokens if provided
          if (responseData.tokens) {
            localStorage.setItem('accessToken', responseData.tokens.access);
            localStorage.setItem('token', responseData.tokens.access);
            localStorage.setItem('refreshToken', responseData.tokens.refresh);
            localStorage.setItem('user', JSON.stringify(responseData.user));
          }

          setSuccessMessage('Account created successfully! Redirecting to login...');

          // Redirect after 2 seconds
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        } else {
          setAuthError(responseData.detail || responseData.error || 'Registration failed. Please try again.');
        }
      } catch (error) {
        console.error('[Registration] Error:', error);
        setAuthError('Cannot connect to server. Please check your connection.');
      } finally {
        setIsSubmitting(false);
      }
    },
    {
      email: validators.email,
      password: (v) => validators.password(v, 8),
      password_confirm: (v) => validators.match(v, values.password, 'Passwords'),
      full_name: (v) => validators.name(v),
      country: validators.required,
      field_of_study: validators.required,
      terms_accepted: (v) => v ? null : 'You must accept the terms',
    }
  );

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleValidation(e);
  };

  return (
    <>
      <Helmet>
        <title>Create Account | NoteAssist AI</title>
        <meta name="description" content="Join NoteAssist AI and start learning smarter with AI-powered note-taking and document analysis tools." />
        <meta name="keywords" content="sign up, registration, create account, join, NoteAssist, AI tools" />
        <meta name="og:title" content="Create Account | NoteAssist AI" />
        <meta name="og:description" content="Join thousands of students using AI-powered note-taking." />
        <meta name="twitter:title" content="Create Account | NoteAssist AI" />
        <meta name="twitter:description" content="Join thousands of students using AI-powered note-taking." />
      </Helmet>

      <PageContainer bgGradient center minHeight>
        {/* Back Button (Mobile) */}
        <button
          onClick={() => navigate('/')}
          className="lg:hidden mb-4 flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        {/* Main Content */}
        <div className="w-full max-w-2xl mx-auto">
          {/* Header Card */}
          <Card 
            variant="elevated" 
            className="animate-fade-in-up mb-8 text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl shadow-lg">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-black bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                NoteAssist AI
              </h1>
            </div>
            
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              Create Your Account
            </h2>
            <p className="text-gray-600 mb-4">
              Join thousands of learners on their journey to success
            </p>

            {/* Features List (Desktop) */}
            <div className="hidden lg:grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
              <div className="text-sm">
                <div className="text-primary-600 font-bold mb-1">✨ Smart Notes</div>
                <p className="text-gray-600 text-xs">AI-powered organization</p>
              </div>
              <div className="text-sm">
                <div className="text-primary-600 font-bold mb-1">🚀 Quick Tools</div>
                <p className="text-gray-600 text-xs">Generate & improve instantly</p>
              </div>
              <div className="text-sm">
                <div className="text-primary-600 font-bold mb-1">🎯 Better Grades</div>
                <p className="text-gray-600 text-xs">Smarter studying</p>
              </div>
            </div>
          </Card>

          {/* Form Card */}
          <Card variant="default" className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 p-4 bg-success-50 border border-success-200 rounded-xl flex items-center gap-3 animate-fade-in-up">
                <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0" />
                <p className="text-success-800 font-medium text-sm">{successMessage}</p>
              </div>
            )}

            {/* Error Message */}
            {authError && (
              <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-xl flex items-center gap-3 animate-fade-in-up">
                <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0" />
                <p className="text-error-800 font-medium text-sm">{authError}</p>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleFormSubmit} className="space-y-5">
              {/* Personal Information Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary-600" />
                  Personal Information
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <FormInput
                    {...getFieldProps('full_name')}
                    label="Full Name"
                    type="text"
                    placeholder="John Doe"
                    icon={User}
                    error={touched.full_name ? errors.full_name : ''}
                    required
                  />

                  {/* Email */}
                  <FormInput
                    {...getFieldProps('email')}
                    label="Email Address"
                    type="email"
                    placeholder="your@email.com"
                    icon={Mail}
                    error={touched.email ? errors.email : ''}
                    required
                  />
                </div>
              </div>

              {/* Password Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary-600" />
                  Password
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Password Input */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Password <span className="text-error-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        {...getFieldProps('password')}
                        placeholder="••••••••"
                        className={`w-full px-4 py-3 border rounded-lg transition-all focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                          touched.password && errors.password 
                            ? 'border-error-300 bg-error-50' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        disabled={isSubmitting}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {touched.password && errors.password && (
                      <p className="text-error-600 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.password}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Min 8 chars, uppercase, lowercase, number</p>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password <span className="text-error-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="password_confirm"
                        type={showConfirmPassword ? 'text' : 'password'}
                        {...getFieldProps('password_confirm')}
                        placeholder="••••••••"
                        className={`w-full px-4 py-3 border rounded-lg transition-all focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                          touched.password_confirm && errors.password_confirm 
                            ? 'border-error-300 bg-error-50' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        disabled={isSubmitting}
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {touched.password_confirm && errors.password_confirm && (
                      <p className="text-error-600 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.password_confirm}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Academic Information Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-primary-600" />
                  Academic Information
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Country */}
                  <FormInput
                    {...getFieldProps('country')}
                    label="Country"
                    type="text"
                    placeholder="United States"
                    icon={Globe}
                    error={touched.country ? errors.country : ''}
                    required
                  />

                  {/* Education Level */}
                  <div>
                    <label htmlFor="education_level" className="block text-sm font-medium text-gray-700 mb-2">
                      Education Level <span className="text-error-600">*</span>
                    </label>
                    <select
                      id="education_level"
                      {...getFieldProps('education_level')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:border-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                      disabled={isSubmitting}
                    >
                      {EDUCATION_LEVELS.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Field of Study */}
                <div className="mt-4">
                  <FormInput
                    {...getFieldProps('field_of_study')}
                    label="Field of Study"
                    type="text"
                    placeholder="Computer Science, Business, Medicine, etc."
                    icon={BookOpen}
                    error={touched.field_of_study ? errors.field_of_study : ''}
                    required
                  />
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <label htmlFor="terms_accepted" className="flex items-start gap-3 cursor-pointer group">
                  <input
                    id="terms_accepted"
                    type="checkbox"
                    {...getFieldProps('terms_accepted')}
                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer focus:ring-2 transition-all"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    I agree to the{' '}
                    <button 
                      type="button" 
                      onClick={() => window.open('/terms', '_blank')}
                      className="text-primary-600 hover:text-primary-700 font-medium underline"
                    >
                      Terms of Service
                    </button>
                    {' '}and{' '}
                    <button 
                      type="button" 
                      onClick={() => window.open('/privacy', '_blank')}
                      className="text-primary-600 hover:text-primary-700 font-medium underline"
                    >
                      Privacy Policy
                    </button>
                  </span>
                </label>
                {touched.terms_accepted && errors.terms_accepted && (
                  <p className="text-error-600 text-sm mt-3 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.terms_accepted}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isSubmitting}
                disabled={isSubmitting}
                icon={isSubmitting ? undefined : ArrowRight}
                iconPosition="right"
                className="mt-6"
              >
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            {/* Security Info */}
            <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-center gap-2 text-sm text-gray-500">
              <Shield className="w-4 h-4" />
              <span>Your information is secure and encrypted with 256-bit SSL</span>
            </div>

            {/* Sign In Link */}
            <p className="text-center mt-6 text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-primary-600 hover:text-primary-700 font-semibold hover-lift"
                disabled={isSubmitting}
              >
                Sign in here
              </button>
            </p>
          </Card>

          {/* Footer Links (Mobile) */}
          <div className="lg:hidden mt-6 flex justify-center gap-4 text-xs text-gray-500">
            <button onClick={() => window.open('/terms', '_blank')} className="hover:text-gray-700">
              Terms
            </button>
            <span>•</span>
            <button onClick={() => window.open('/privacy', '_blank')} className="hover:text-gray-700">
              Privacy
            </button>
          </div>
        </div>
      </PageContainer>
    </>
  );
}