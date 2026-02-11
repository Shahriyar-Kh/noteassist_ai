// FILE: src/hooks/useActionState.js
// ============================================================================
// ⚡ POWERFUL HOOK: Automatic loading state management for ALL async actions
// Eliminates button delay perception, provides optimal UX feedback
// ============================================================================

import { useState, useCallback } from 'react';
import { showToast } from '@/components/common/Toast';

/**
 * useActionState Hook
 * Manages loading, success, and error states for async operations
 * 
 * Usage:
 * const { loading, execute, error } = useActionState();
 * 
 * Then in button onclick:
 * <button onClick={() => execute(noteService.createNote(data))}>
 *   {loading ? 'Creating...' : 'Create'}
 * </button>
 */
export const useActionState = (options = {}) => {
  const {
    onSuccess = null,
    onError = null,
    successMessage = null,
    errorMessage = null,
    showMessages = true,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const execute = useCallback(
    async (asyncFn, isPromise = true) => {
      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        // Handle both raw promises and functions that return promises
        const result = typeof asyncFn === 'function' ? await asyncFn() : await asyncFn;

        setSuccess(true);

        if (successMessage && showMessages) {
          showToast.success(successMessage);
        }

        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (err) {
        const errorMsg = err.response?.data?.error 
          || err.response?.data?.message 
          || err.message 
          || 'An error occurred';
        
        setError(errorMsg);

        if (errorMessage && showMessages) {
          showToast.error(errorMessage);
        } else if (showMessages) {
          showToast.error(errorMsg);
        }

        if (onError) {
          onError(err);
        }

        throw err;
      } finally {
        setLoading(false);
      }
    },
    [onSuccess, onError, successMessage, errorMessage, showMessages]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setSuccess(false);
  }, []);

  return {
    loading,
    error,
    success,
    execute,
    reset,
    setLoading,
    setError,
    setSuccess,
  };
};

/**
 * Advanced hook for multiple sequential or parallel operations
 */
export const useMultiActionState = (operations = {}) => {
  const [loadingStates, setLoadingStates] = useState(
    Object.keys(operations).reduce((acc, key) => ({ ...acc, [key]: false }), {})
  );
  const [errors, setErrors] = useState({});
  const [successes, setSuccesses] = useState({});

  const executeAction = useCallback(
    async (actionKey, asyncFn, options = {}) => {
      const {
        onSuccess = null,
        onError = null,
        showMessages = true,
      } = options;

      setLoadingStates(prev => ({ ...prev, [actionKey]: true }));
      setErrors(prev => ({ ...prev, [actionKey]: null }));

      try {
        const result = typeof asyncFn === 'function' ? await asyncFn() : await asyncFn;

        setSuccesses(prev => ({ ...prev, [actionKey]: true }));

        if (showMessages) {
          showToast.success(options.successMessage || `${actionKey} completed successfully`);
        }

        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (err) {
        const errorMsg = err.response?.data?.error || err.message;
        setErrors(prev => ({ ...prev, [actionKey]: errorMsg }));

        if (showMessages) {
          showToast.error(options.errorMessage || errorMsg);
        }

        if (onError) {
          onError(err);
        }

        throw err;
      } finally {
        setLoadingStates(prev => ({ ...prev, [actionKey]: false }));
      }
    },
    []
  );

  return {
    loadingStates,
    errors,
    successes,
    executeAction,
    isLoading: Object.values(loadingStates).some(v => v),
    isError: Object.values(errors).some(v => v),
  };
};
