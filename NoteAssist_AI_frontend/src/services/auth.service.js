// FILE: src/services/auth.service.js
// ============================================================================

import api from './api';
import { API_ENDPOINTS } from '@/utils/constants';
import logger from '@/utils/logger';
import { sanitizeString } from '@/utils/validation';

export const authService = {
  // Register new user
  register: async (userData) => {
    try {
      logger.info('Registration request');
      const payload = {
        ...userData,
        email: sanitizeString(userData.email || '').toLowerCase(),
        full_name: sanitizeString(userData.full_name || ''),
        country: sanitizeString(userData.country || ''),
      };
      const response = await api.post(API_ENDPOINTS.REGISTER, payload);
      logger.info('Registration response');
      
      if (response.data.tokens) {
        localStorage.setItem('accessToken', sanitizeString(response.data.tokens.access || ''));
        localStorage.setItem('refreshToken', sanitizeString(response.data.tokens.refresh || ''));
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      logger.error('Registration error');
      throw error.response?.data || { detail: 'Registration failed' };
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      logger.info('Login request');
      const payload = {
        email: sanitizeString(email || '').toLowerCase(),
        password: sanitizeString(password || ''),
      };
      const response = await api.post(API_ENDPOINTS.LOGIN, payload);
      logger.info('Login response');
      
      if (response.data.access) {
        localStorage.setItem('accessToken', sanitizeString(response.data.access || ''));
        localStorage.setItem('refreshToken', sanitizeString(response.data.refresh || ''));
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('redirect', response.data.redirect || '/dashboard');
      }
      
      return response.data;
    } catch (error) {
      logger.error('Login error');
      const errorData = error.response?.data || { detail: 'Login failed' };
      
      // ✅ Enhanced error handling for blocked users
      if (errorData.error_type === 'account_blocked' || errorData.blocked_reason) {
        return {
          error_type: 'account_blocked',
          detail: errorData.blocked_reason || errorData.detail || 'Your account has been blocked',
          is_blocked: true,
          blocked_reason: errorData.blocked_reason || errorData.detail
        };
      }
      
      throw errorData;
    }
  },

  // Logout user
  logout: async () => {
    try {
      const refreshToken = sanitizeString(localStorage.getItem('refreshToken') || '');
      if (refreshToken) {
        await api.post(API_ENDPOINTS.LOGOUT, { refresh: refreshToken });
      }
    } catch (error) {
      logger.error('Logout error');
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('redirect');
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.ME);
      localStorage.setItem('user', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      logger.error('Get current user error');
      throw error;
    }
  },

  // Update profile
  updateProfile: async (profileData) => {
    try {
      const response = await api.put(API_ENDPOINTS.UPDATE_PROFILE, profileData);
      return response.data;
    } catch (error) {
      logger.error('Update profile error');
      throw error;
    }
  },

  // Get stored user
  getStoredUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Get raw access token
  getAccessToken: () => {
    return sanitizeString(localStorage.getItem('accessToken') || localStorage.getItem('token') || '');
  },

  // Get raw refresh token
  getRefreshToken: () => {
    return sanitizeString(localStorage.getItem('refreshToken') || '');
  },

  // Check if authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('accessToken');
  },

  // Get redirect URL
  getRedirectUrl: () => {
    return localStorage.getItem('redirect') || '/dashboard';
  },

  // ==================== GUEST MODE ====================
  
  // Initialize guest session
  startGuestSession: async () => {
    try {
      const response = await api.post(API_ENDPOINTS.GUEST_SESSION);
      logger.info('Guest session started');
      
      // Store guest session info
      localStorage.setItem('isGuest', 'true');
      localStorage.setItem('guestSession', JSON.stringify(response.data));
      
      return response.data;
    } catch (error) {
      logger.error('Guest session error');
      throw error.response?.data || { detail: 'Failed to start guest session' };
    }
  },

  // Get guest session status
  getGuestSession: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.GUEST_SESSION);
      return response.data;
    } catch (error) {
      logger.error('Get guest session error');
      throw error;
    }
  },

  // Clear guest session
  clearGuestSession: async () => {
    try {
      await api.delete(API_ENDPOINTS.GUEST_SESSION);
    } catch (error) {
      logger.error('Clear guest session error');
    } finally {
      localStorage.removeItem('isGuest');
      localStorage.removeItem('guestSession');
    }
  },

  // Check if user is guest
  isGuest: () => {
    return localStorage.getItem('isGuest') === 'true';
  },

  // Get stored guest session
  getStoredGuestSession: () => {
    const session = localStorage.getItem('guestSession');
    return session ? JSON.parse(session) : null;
  },

  // Update guest session in storage
  updateGuestSession: (sessionData) => {
    localStorage.setItem('guestSession', JSON.stringify(sessionData));
  },
};