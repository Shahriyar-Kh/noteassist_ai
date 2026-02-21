// FILE: src/utils/authValidator.js
// ============================================================================
// Authentication Validator - Checks if user can perform authenticated actions
// ============================================================================

import { showToast } from '@/services/api';
import logger from '@/utils/logger';
import { sanitizeString } from '@/utils/validation';

/**
 * AuthValidator - Ensures user is authenticated before performing actions
 * 
 * Features:
 * - Checks for valid authentication tokens
 * - Detects guest sessions
 * - Shows user-friendly messages
 * - Redirects to login when needed
 */

export const AuthValidator = {
  /**
   * Check if user is authenticated
   * @returns {boolean} True if user has valid auth token
   */
  isAuthenticated() {
    const token = sanitizeString(localStorage.getItem('accessToken') || localStorage.getItem('token') || '');
    return !!token;
  },

  /**
   * Check if user is in guest mode
   * @returns {boolean} True if user is guest
   */
  isGuest() {
    return localStorage.getItem('isGuest') === 'true';
  },

  /**
   * Get current auth token
   * @returns {string | null} Access token or null
   */
  getToken() {
    return sanitizeString(localStorage.getItem('accessToken') || localStorage.getItem('token') || '') || null;
  },

  /**
   * Get current user data
   * @returns {object | null} User object or null
   */
  getUser() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  },

  /**
   * Validate action - Returns true if user can perform action, false otherwise
   * @param {string} actionName - Name of the action (for logging)
   * @param {boolean} showMessage - Whether to show toast message
   * @returns {boolean} True if user can perform action
   */
  validateAction(actionName = 'perform this action', showMessage = true) {
    if (!this.isAuthenticated()) {
      if (showMessage) {
        showToast({
          type: 'warning',
          message: 'Please login or register to continue',
          description: `You need to be logged in to ${actionName}.`,
          duration: 5000,
        });
      }
      return false;
    }

    if (this.isGuest()) {
      if (showMessage) {
        showToast({
          type: 'info',
          message: 'Guest access not allowed',
          description: `Please create an account to ${actionName}.`,
          duration: 5000,
        });
      }
      return false;
    }

    return true;
  },

  /**
   * Validate and redirect to login if not authenticated
   * @param {string} actionName - Name of the action
   * @param {function} redirectFn - Function to call for redirect (e.g., navigate)
   * @returns {boolean} True if user can proceed, false if redirected
   */
  validateAndRedirect(actionName = 'access this', redirectFn = null) {
    if (!this.isAuthenticated() || this.isGuest()) {
      this.validateAction(actionName, true);

      // Redirect to login after a short delay to show message
      if (redirectFn) {
        setTimeout(() => {
          redirectFn('/login');
        }, 500);
      }

      return false;
    }

    return true;
  },

  /**
   * Require authentication - Throws error if not authenticated
   * @param {string} actionName - Name of the action
   * @throws {Error} If not authenticated
   */
  requireAuth(actionName = 'perform this action') {
    if (!this.isAuthenticated() || this.isGuest()) {
      const message = `Authentication required to ${actionName}`;
      this.validateAction(actionName, true);
      throw new Error(message);
    }
  },

  /**
   * Create an async action wrapper that validates auth before execution
   * @param {function} asyncFn - Async function to execute
   * @param {string} actionName - Name of the action
   * @returns {function} Wrapped async function
   */
  async executeAuthenticatedAction(asyncFn, actionName = 'perform this action') {
    try {
      if (!this.validateAction(actionName, true)) {
        return { success: false, error: 'Not authenticated' };
      }

      return await asyncFn();
    } catch (error) {
      logger.error(`[AuthValidator] Error in ${actionName}:`, String(error));
      throw error;
    }
  },

  /**
   * Create a validation wrapper for component methods
   * @param {function} method - Method to wrap
   * @param {string} actionName - Name of the action
   * @returns {function} Wrapped method
   */
  createValidatedAction(method, actionName = 'perform this action') {
    return (...args) => {
      if (!this.validateAction(actionName, true)) {
        return null;
      }
      return method(...args);
    };
  },
};

export default AuthValidator;
