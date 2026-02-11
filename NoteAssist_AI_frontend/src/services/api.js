// FILE: src/services/api.js
// ============================================================================
// ⚡ OPTIMIZED API CLIENT with automatic performance monitoring

import axios from 'axios';
import { API_BASE_URL } from '@/utils/constants';
import { performanceMonitor } from '@/utils/performanceMonitor';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable sending cookies for guest sessions
  timeout: 30000, // 30s timeout
});

// Helper functions for token management
const getAccessToken = () => {
  // Support both 'token' and 'accessToken' for backward compatibility
  return localStorage.getItem('token') || localStorage.getItem('accessToken');
};

const getRefreshToken = () => {
  return localStorage.getItem('refreshToken');
};

const setTokens = (access, refresh) => {
  localStorage.setItem('token', access);
  localStorage.setItem('accessToken', access); // Keep both for compatibility
  if (refresh) {
    localStorage.setItem('refreshToken', refresh);
  }
};

const clearTokens = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

// ⚡ REQUEST INTERCEPTOR - Add auth token + Performance tracking
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // ⚡ Store request start time for performance monitoring
    config.metadata = { startTime: Date.now() };
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ⚡ RESPONSE INTERCEPTOR - Handle token refresh + Performance tracking
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    // ⚡ Track successful API response
    if (response.config.metadata) {
      const duration = Date.now() - response.config.metadata.startTime;
      const endpoint = response.config.url;
      const method = response.config.method;
      const cached = response.headers['x-from-cache'] === 'true';
      
      performanceMonitor.trackApiCall(endpoint, method, response.config.metadata.startTime, duration, response.status, cached);

      // Log slow requests in development
      if (process.env.NODE_ENV === 'development' && duration > 1000) {
        console.warn(`⚠️ Slow API: ${method.toUpperCase()} ${endpoint} took ${duration}ms`);
      }
    }
    
    return response;
  },
  async (error) => {
    // ⚡ Track failed API response
    if (error.config && error.config.metadata) {
      const duration = Date.now() - error.config.metadata.startTime;
      const endpoint = error.config.url;
      const method = error.config.method;
      const status = error.response?.status || 0;
      
      performanceMonitor.trackApiCall(endpoint, method, error.config.metadata.startTime, duration, status, false);
    }

    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${API_BASE_URL}api/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access, refresh: newRefresh } = response.data;
        setTokens(access, newRefresh || refreshToken);

        // Update the authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
        originalRequest.headers.Authorization = `Bearer ${access}`;

        processQueue(null, access);
        isRefreshing = false;

        // Retry the original request with new token
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Refresh failed - logout user
        clearTokens();
        
        // Redirect to login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Export helper functions if needed elsewhere
export { getAccessToken, getRefreshToken, setTokens, clearTokens };