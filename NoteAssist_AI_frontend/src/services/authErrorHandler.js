// FILE: src/services/authErrorHandler.js
// ============================================================================
// Authentication Error Handler - Handles 401/403 responses from API
// ============================================================================

import { showToast } from '@/services/api';

/**
 * AuthErrorHandler - Handles authentication errors from API responses
 * 
 * Features:
 * - Detects 401 (Unauthorized) and 403 (Forbidden) responses
 * - Shows user-friendly error messages
 * - Redirects to login on authorization failure
 * - Preserves intended navigation for post-login redirect
 */

export const AuthErrorHandler = {
  /**
   * Handle API error response
   * @param {object} error - Error object from API
   * @param {string} actionName - Name of the action that failed
   * @param {function} redirectFn - Function to redirect (e.g., navigate('/login'))
   * @returns {boolean} True if error was handled, false otherwise
   */
  handleError(error, actionName = 'This action', redirectFn = null) {
    if (!error || !error.response) {
      return false;
    }

    const status = error.response.status;
    const data = error.response.data;

    // Handle 401 Unauthorized
    if (status === 401) {
      showToast({
        type: 'error',
        message: 'Session Expired',
        description: 'Please log in again to continue.',
        duration: 5000,
      });

      if (redirectFn) {
        setTimeout(() => redirectFn('/login'), 500);
      }
      return true;
    }

    // Handle 403 Forbidden (permission denied, not authenticated)
    if (status === 403) {
      const message = data?.message || `Authentication required to ${actionName}`;
      
      showToast({
        type: 'warning',
        message: 'Authentication Required',
        description: message || 'You need to log in to perform this action.',
        duration: 5000,
      });

      if (redirectFn) {
        setTimeout(() => redirectFn('/login'), 500);
      }
      return true;
    }

    return false;
  },

  /**
   * Check if error is authentication-related
   * @param {object} error - Error object from API
   * @returns {boolean} True if error is 401 or 403
   */
  isAuthError(error) {
    return (
      error &&
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    );
  },

  /**
   * Intercept API error and handle auth errors
   * @param {object} error - Error from API call
   * @param {object} options - Options object
   * @returns {Promise} Rejects if handled, resolves otherwise
   */
  async interceptError(error, options = {}) {
    const {
      actionName = 'This action',
      redirectFn = null,
      showMessage = true,
      throwError = true,
    } = options;

    if (this.isAuthError(error)) {
      if (showMessage) {
        this.handleError(error, actionName, redirectFn);
      }

      if (throwError) {
        throw error;
      }
      return null;
    }

    // If not an auth error, rethrow
    throw error;
  },
};

export default AuthErrorHandler;
