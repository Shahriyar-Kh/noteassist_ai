// FILE: src/hooks/useAuthAction.js
// ============================================================================
// Custom Hook - useAuthAction - Handles authenticated actions with validation
// ============================================================================

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthValidator from '@/utils/authValidator';
import { showToast } from '@/services/api';

/**
 * useAuthAction - Custom hook for executing authenticated actions
 * 
 * Features:
 * - Validates authentication before executing
 * - Shows user-friendly messages
 * - Handles redirect to login
 * - Type-safe with loading and error states
 * 
 * @param {string} actionName - Name of the action (for messages)
 * @param {boolean} autoRedirect - Auto-redirect to login if not authenticated
 * @returns {object} { execute, isLoading, error, hasError, canExecute }
 */
export const useAuthAction = (actionName = 'Perform this action', autoRedirect = true) => {
  const navigate = useNavigate();

  // Check if user can execute action
  const canExecute = useCallback(() => {
    if (!AuthValidator.isAuthenticated() || AuthValidator.isGuest()) {
      showToast({
        type: 'warning',
        message: 'Please login or register',
        description: `You need to be logged in to ${actionName.toLowerCase()}.`,
        duration: 5000,
      });

      if (autoRedirect) {
        setTimeout(() => navigate('/login'), 500);
      }

      return false;
    }
    return true;
  }, [actionName, autoRedirect, navigate]);

  // Execute async action with auth validation
  const execute = useCallback(
    async (asyncFn) => {
      if (!canExecute()) {
        return { success: false, error: 'Not authenticated' };
      }

      try {
        const result = await asyncFn();
        return { success: true, data: result };
      } catch (error) {
        console.error(`[useAuthAction] Error in ${actionName}:`, error);
        return { success: false, error: error.message };
      }
    },
    [canExecute, actionName]
  );

  return {
    execute,
    canExecute,
    isAuthenticated: AuthValidator.isAuthenticated(),
    isGuest: AuthValidator.isGuest(),
    hasValidAuth: AuthValidator.isAuthenticated() && !AuthValidator.isGuest(),
  };
};

export default useAuthAction;
