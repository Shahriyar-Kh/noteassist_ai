// FILE: src/services/api.js
// ============================================================================
// FIXED: Robust API client with automatic token refresh & session persistence
// Prevents unexpected logouts by silently refreshing expired access tokens
// ============================================================================

import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '@/utils/constants';
import logger from '@/utils/logger';

// ─── Configuration ────────────────────────────────────────────────────────────

const BASE_URL = API_BASE_URL || (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:8000' : window.location.origin)
);

// ─── Token Management Helpers ─────────────────────────────────────────────────

const TokenManager = {
  getAccess: () => localStorage.getItem('accessToken'),
  getRefresh: () => localStorage.getItem('refreshToken'),

  setTokens: (access, refresh) => {
    if (access) localStorage.setItem('accessToken', access);
    if (refresh) localStorage.setItem('refreshToken', refresh);
  },

  clearAll: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('redirect');
    localStorage.removeItem('isGuest');
    localStorage.removeItem('guestSession');
  },

  isAccessExpiringSoon: () => {
    // Proactively refresh if token will expire in next 2 minutes
    try {
      const token = TokenManager.getAccess();
      if (!token) return true;
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = payload.exp * 1000;
      const twoMinutesFromNow = Date.now() + 2 * 60 * 1000;
      return expiresAt < twoMinutesFromNow;
    } catch {
      return true;
    }
  },
};

// ─── Refresh Token State (prevents concurrent refresh race conditions) ─────────

let isRefreshing = false;
let failedRequestQueue = []; // requests waiting for the refreshed token

const processQueue = (error, token = null) => {
  failedRequestQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedRequestQueue = [];
};

// ─── Perform Token Refresh ────────────────────────────────────────────────────

const refreshAccessToken = async () => {
  const refreshToken = TokenManager.getRefresh();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  // Use a plain axios instance (no interceptors) to avoid infinite loops
  const response = await axios.post(
    `${BASE_URL}/api/token/refresh/`,
    { refresh: refreshToken },
    { headers: { 'Content-Type': 'application/json' } }
  );

  const { access, refresh } = response.data;
  TokenManager.setTokens(access, refresh || refreshToken);
  logger.info('[API] Token refreshed successfully');
  return access;
};

// ─── Redirect to Login (only when truly unauthenticated) ─────────────────────

const redirectToLogin = (reason = 'session_expired') => {
  logger.warn(`[API] Redirecting to login: ${reason}`);

  // Save current path for post-login redirect
  const currentPath = window.location.pathname + window.location.search;
  if (currentPath !== '/login' && currentPath !== '/register') {
    sessionStorage.setItem('postLoginRedirect', currentPath);
  }

  TokenManager.clearAll();

  // Dispatch custom event so React can update state without a hard reload
  window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason } }));

  // Soft redirect (no full page reload preserves SPA state)
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
};

// ─── Create Axios Instance ────────────────────────────────────────────────────

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ─── Request Interceptor: Attach Access Token ─────────────────────────────────

api.interceptors.request.use(
  async (config) => {
    // Skip auth for public endpoints
    const publicEndpoints = ['/api/token/', '/api/token/refresh/', '/api/auth/register/', '/api/auth/google_auth/'];
    const isPublic = publicEndpoints.some((ep) => config.url?.includes(ep));
    if (isPublic) return config;

    let accessToken = TokenManager.getAccess();

    // Proactively refresh if token is expiring soon (prevents mid-request expiry)
    if (accessToken && TokenManager.isAccessExpiringSoon() && !isRefreshing) {
      try {
        isRefreshing = true;
        accessToken = await refreshAccessToken();
        processQueue(null, accessToken);
      } catch (err) {
        processQueue(err, null);
        logger.warn('[API] Proactive refresh failed, will retry on 401');
      } finally {
        isRefreshing = false;
      }
    }

    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Handle 401 with Silent Token Refresh ───────────────

api.interceptors.response.use(
  (response) => response, // Pass through successful responses

  async (error) => {
    const originalRequest = error.config;

    // Only handle 401 Unauthorized
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Prevent infinite retry loop
    if (originalRequest._retry) {
      logger.warn('[API] Token refresh failed after retry, logging out');
      redirectToLogin('token_refresh_failed');
      return Promise.reject(error);
    }

    // Don't retry refresh endpoint itself
    if (originalRequest.url?.includes('/api/token/refresh/')) {
      redirectToLogin('refresh_token_expired');
      return Promise.reject(error);
    }

    // If another refresh is already in progress, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedRequestQueue.push({
          resolve: (token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(api(originalRequest));
          },
          reject: (err) => reject(err),
        });
      });
    }

    // Start token refresh
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const newAccessToken = await refreshAccessToken();
      processQueue(null, newAccessToken);

      // Retry the original request with the new token
      originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
      return api(originalRequest);

    } catch (refreshError) {
      processQueue(refreshError, null);
      logger.error('[API] Token refresh failed:', refreshError.message);

      // Only logout if refresh token is truly invalid (not network error)
      const isNetworkError = !refreshError.response;
      if (!isNetworkError) {
        redirectToLogin('refresh_token_invalid');
      } else {
        logger.warn('[API] Network error during refresh - keeping session, will retry later');
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ─── Toast Helper (exported for use in services) ──────────────────────────────

export const showToast = (options) => {
  const { type = 'info', message, description, duration = 4000 } = options || {};
  // Attempt to use the app's toast system; fall back to console
  try {
    const event = new CustomEvent('app:toast', { detail: { type, message, description, duration } });
    window.dispatchEvent(event);
  } catch {
    logger[type === 'error' ? 'error' : 'info'](`[Toast] ${message}: ${description}`);
  }
};

export { TokenManager };
export default api;