// FILE: src/services/auth.service.js
// ============================================================================
// FIXED: Robust auth service with silent refresh and persistent sessions
// ============================================================================

import api, { TokenManager, refreshAccessToken } from './api';
import { API_ENDPOINTS } from '@/utils/constants';
import logger from '@/utils/logger';
import { sanitizeString } from '@/utils/validation';

// ─── Session Activity Tracker ─────────────────────────────────────────────────
// Tracks user activity so we don't log them out when they're actively using the app

const ActivityTracker = {
  _lastActivity: Date.now(),
  _listeners: [],

  record() {
    this._lastActivity = Date.now();
  },

  getSecondsSinceActivity() {
    return (Date.now() - this._lastActivity) / 1000;
  },

  init() {
    // Track all user interactions
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    const handler = () => this.record();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, handler));
  },
};

// ─── Proactive Token Refresh Scheduler ───────────────────────────────────────

let refreshSchedulerId = null;

const scheduleTokenRefresh = (accessToken) => {
  if (refreshSchedulerId) {
    clearTimeout(refreshSchedulerId);
  }

  if (!accessToken) return;

  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    const expiresAt = payload.exp * 1000;
    // Refresh 3 minutes before expiry
    const refreshIn = Math.max(expiresAt - Date.now() - 3 * 60 * 1000, 0);

    logger.info(`[AuthService] Token refresh scheduled in ${Math.round(refreshIn / 1000)}s`);

    refreshSchedulerId = setTimeout(async () => {
      // If user is idle > 30 min, reschedule with a shorter retry instead of dying
      const idleSeconds = ActivityTracker.getSecondsSinceActivity();
      if (idleSeconds > 30 * 60) {
        logger.info('[AuthService] User idle, deferring refresh (will retry in 5 min)');
        const currentAccess = TokenManager.getAccess();
        if (currentAccess) {
          refreshSchedulerId = setTimeout(() => {
            const token = TokenManager.getAccess();
            if (token) scheduleTokenRefresh(token);
          }, 5 * 60 * 1000);
        }
        return;
      }

      try {
        const refreshToken = TokenManager.getRefresh();
        if (!refreshToken) return;

        // Use plain-axios refreshAccessToken (no interceptors) to avoid
        // the response interceptor calling redirectToLogin on race conditions
        const newAccess = await refreshAccessToken();

        logger.info('[AuthService] Proactive token refresh successful');
        scheduleTokenRefresh(newAccess); // Schedule next refresh
      } catch (err) {
        logger.error('[AuthService] Proactive refresh failed:', err.message);
        // Reschedule retry in 2 minutes instead of dying
        refreshSchedulerId = setTimeout(() => {
          const token = TokenManager.getAccess();
          if (token) scheduleTokenRefresh(token);
        }, 2 * 60 * 1000);
      }
    }, refreshIn);
  } catch (err) {
    logger.warn('[AuthService] Could not parse token for scheduling:', err.message);
  }
};

// ─── Visibility Change Handler ───────────────────────────────────────────────
// When user returns to the tab after it was backgrounded, immediately check
// token validity and refresh if needed. Browser timer throttling can cause
// the scheduler to miss its window while the tab is inactive.

let visibilityListenerActive = false;

const setupVisibilityRefresh = () => {
  if (visibilityListenerActive) return;
  visibilityListenerActive = true;

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return;

    // User just came back to the tab
    ActivityTracker.record();

    const accessToken = TokenManager.getAccess();
    const refreshToken = TokenManager.getRefresh();
    if (!accessToken || !refreshToken) return;

    if (TokenManager.isAccessExpiringSoon()) {
      logger.info('[AuthService] Tab visible — token expiring, refreshing...');
      try {
        const newAccess = await refreshAccessToken();
        scheduleTokenRefresh(newAccess);
        logger.info('[AuthService] Token refreshed on tab visibility');
      } catch (err) {
        logger.warn('[AuthService] Visibility refresh failed:', err.message);
      }
    } else {
      // Token still valid — make sure the scheduler is still running
      scheduleTokenRefresh(accessToken);
    }
  });
};

// ─── Auth Service ─────────────────────────────────────────────────────────────

export const authService = {
  // ── Internal helpers ────────────────────────────────────────────────────────

  _storeSession(data) {
    const { access, refresh, tokens, user, redirect } = data;
    const accessToken = access || tokens?.access;
    const refreshToken = refresh || tokens?.refresh;

    if (accessToken) localStorage.setItem('accessToken', sanitizeString(accessToken));
    if (refreshToken) localStorage.setItem('refreshToken', sanitizeString(refreshToken));
    if (user) localStorage.setItem('user', JSON.stringify(user));
    if (redirect) localStorage.setItem('redirect', redirect);

    // Start proactive refresh scheduler
    if (accessToken) {
      scheduleTokenRefresh(accessToken);
      ActivityTracker.init();
      setupVisibilityRefresh();
    }
  },

  // ── Register ─────────────────────────────────────────────────────────────────

  register: async (userData) => {
    try {
      logger.info('[AuthService] Registration request');
      const payload = {
        ...userData,
        email: sanitizeString(userData.email || '').toLowerCase(),
        full_name: sanitizeString(userData.full_name || ''),
        country: sanitizeString(userData.country || ''),
      };
      const response = await api.post(API_ENDPOINTS.REGISTER, payload);

      if (response.data.tokens || response.data.access) {
        authService._storeSession(response.data);
      }

      return response.data;
    } catch (error) {
      logger.error('[AuthService] Registration error');
      throw error.response?.data || { detail: 'Registration failed' };
    }
  },

  // ── Login ────────────────────────────────────────────────────────────────────

  login: async (email, password) => {
    try {
      logger.info('[AuthService] Login request');
      const payload = {
        email: sanitizeString(email || '').toLowerCase(),
        password: sanitizeString(password || ''),
      };
      const response = await api.post(API_ENDPOINTS.LOGIN, payload);

      if (response.data.access || response.data.tokens) {
        authService._storeSession(response.data);
      }

      return response.data;
    } catch (error) {
      logger.error('[AuthService] Login error');
      const errorData = error.response?.data || { detail: 'Login failed' };

      if (errorData.error_type === 'account_blocked' || errorData.blocked_reason) {
        return {
          error_type: 'account_blocked',
          detail: errorData.blocked_reason || errorData.detail || 'Your account has been blocked',
          is_blocked: true,
          blocked_reason: errorData.blocked_reason || errorData.detail,
        };
      }

      throw errorData;
    }
  },

  // ── Logout ───────────────────────────────────────────────────────────────────

  logout: async () => {
    try {
      const refreshToken = sanitizeString(localStorage.getItem('refreshToken') || '');
      if (refreshToken) {
        await api.post(API_ENDPOINTS.LOGOUT, { refresh: refreshToken });
      }
    } catch (error) {
      logger.error('[AuthService] Logout error (server):', error.message);
      // Continue local logout even if server call fails
    } finally {
      if (refreshSchedulerId) clearTimeout(refreshSchedulerId);
      TokenManager.clearAll();
    }
  },

  // ── Get current user ─────────────────────────────────────────────────────────

  getCurrentUser: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.ME);
      localStorage.setItem('user', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      logger.error('[AuthService] Get current user error');
      throw error;
    }
  },

  // ── Update profile ───────────────────────────────────────────────────────────

  updateProfile: async (profileData) => {
    try {
      const response = await api.put(API_ENDPOINTS.UPDATE_PROFILE, profileData);
      return response.data;
    } catch (error) {
      logger.error('[AuthService] Update profile error');
      throw error;
    }
  },

  // ── Refresh token (manual) ───────────────────────────────────────────────────

  refreshToken: async () => {
    const refresh = TokenManager.getRefresh();
    if (!refresh) throw new Error('No refresh token');

    const response = await api.post('/api/token/refresh/', { refresh });
    const { access, refresh: newRefresh } = response.data;
    TokenManager.setTokens(access, newRefresh || refresh);
    scheduleTokenRefresh(access);
    return access;
  },

  // ── Restore session on app boot ───────────────────────────────────────────────

  restoreSession: () => {
    const accessToken = TokenManager.getAccess();
    const refreshToken = TokenManager.getRefresh();

    if (accessToken) {
      // Resume proactive refresh scheduling
      scheduleTokenRefresh(accessToken);
      ActivityTracker.init();
      setupVisibilityRefresh();
      logger.info('[AuthService] Session restored from storage');
      return true;
    }
    return false;
  },

  // ── Storage helpers ──────────────────────────────────────────────────────────

  getStoredUser: () => {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  getAccessToken: () => TokenManager.getAccess(),
  getRefreshToken: () => TokenManager.getRefresh(),
  isAuthenticated: () => !!TokenManager.getAccess(),
  getRedirectUrl: () => localStorage.getItem('redirect') || '/dashboard',

  // ── Guest session ────────────────────────────────────────────────────────────

  startGuestSession: async () => {
    try {
      const response = await api.post(API_ENDPOINTS.GUEST_SESSION);
      localStorage.setItem('isGuest', 'true');
      localStorage.setItem('guestSession', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      logger.error('[AuthService] Guest session error');
      throw error.response?.data || { detail: 'Failed to start guest session' };
    }
  },

  getGuestSession: async () => {
    const response = await api.get(API_ENDPOINTS.GUEST_SESSION);
    return response.data;
  },

  clearGuestSession: async () => {
    try {
      await api.delete(API_ENDPOINTS.GUEST_SESSION);
    } catch (error) {
      logger.error('[AuthService] Clear guest session error');
    } finally {
      localStorage.removeItem('isGuest');
      localStorage.removeItem('guestSession');
    }
  },

  isGuest: () => localStorage.getItem('isGuest') === 'true',

  getStoredGuestSession: () => {
    try {
      const session = localStorage.getItem('guestSession');
      return session ? JSON.parse(session) : null;
    } catch {
      return null;
    }
  },

  updateGuestSession: (sessionData) => {
    localStorage.setItem('guestSession', JSON.stringify(sessionData));
  },
};

export default authService;