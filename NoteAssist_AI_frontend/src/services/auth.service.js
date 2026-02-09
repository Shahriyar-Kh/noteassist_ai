// FILE: src/services/auth.service.js
// ============================================================================

import api from './api';
import { API_ENDPOINTS } from '@/utils/constants';

export const authService = {
  // Register new user
  register: async (userData) => {
    try {
      console.log('Registration request:', userData);
      const response = await api.post(API_ENDPOINTS.REGISTER, userData);
      console.log('Registration response:', response.data);
      
      if (response.data.tokens) {
        localStorage.setItem('accessToken', response.data.tokens.access);
        localStorage.setItem('refreshToken', response.data.tokens.refresh);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      console.error('Registration error:', error.response?.data || error);
      throw error.response?.data || { detail: 'Registration failed' };
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      console.log('Login request for:', email);
      const response = await api.post(API_ENDPOINTS.LOGIN, { 
        email: email.toLowerCase().trim(), 
        password 
      });
      console.log('Login response:', response.data);
      
      if (response.data.access) {
        localStorage.setItem('accessToken', response.data.access);
        localStorage.setItem('refreshToken', response.data.refresh);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('redirect', response.data.redirect || '/dashboard');
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error.response?.data || error);
      throw error.response?.data || { detail: 'Login failed' };
    }
  },

  // Logout user
  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post(API_ENDPOINTS.LOGOUT, { refresh: refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
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
      console.error('Get current user error:', error);
      throw error;
    }
  },

  // Update profile
  updateProfile: async (profileData) => {
    try {
      const response = await api.put(API_ENDPOINTS.UPDATE_PROFILE, profileData);
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  // Get stored user
  getStoredUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
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
      console.log('Guest session started:', response.data);
      
      // Store guest session info
      localStorage.setItem('isGuest', 'true');
      localStorage.setItem('guestSession', JSON.stringify(response.data));
      
      return response.data;
    } catch (error) {
      console.error('Guest session error:', error);
      throw error.response?.data || { detail: 'Failed to start guest session' };
    }
  },

  // Get guest session status
  getGuestSession: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.GUEST_SESSION);
      return response.data;
    } catch (error) {
      console.error('Get guest session error:', error);
      throw error;
    }
  },

  // Clear guest session
  clearGuestSession: async () => {
    try {
      await api.delete(API_ENDPOINTS.GUEST_SESSION);
    } catch (error) {
      console.error('Clear guest session error:', error);
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