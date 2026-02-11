// FILE: src/hooks/useAsync.js
// ============================================================================
// Custom hook for managing async operations with loading states
// ============================================================================

import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook for handling async operations with loading, error, and data states
 * Also prevents duplicate requests
 * 
 * Usage:
 *   const { data, loading, error, execute } = useAsync(asyncFunction, {
 *     onSuccess: (data) => console.log('Success:', data),
 *     onError: (error) => console.log('Error:', error),
 *     skipInitialCall: true
 *   });
 * 
 *   const handleClick = () => execute(params);
 */
export const useAsync = (asyncFunction, options = {}) => {
  const { onSuccess, onError, skipInitialCall = true } = options;

  const [state, setState] = useState({
    loading: !skipInitialCall,
    data: null,
    error: null,
    progress: 0,
  });

  // Prevent duplicate requests
  const requestInProgress = useRef(false);
  const abortController = useRef(new AbortController());

  const execute = useCallback(async (...args) => {
    // Prevent duplicate requests
    if (requestInProgress.current) {
      console.warn('Request already in progress');
      return state.data;
    }

    requestInProgress.current = true;
    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      progress: 0,
    }));

    try {
      // Create new abort controller
      abortController.current = new AbortController();

      setState((prev) => ({ ...prev, progress: 25 }));

      const response = await asyncFunction(...args, {
        signal: abortController.current.signal,
      });

      setState((prev) => ({ ...prev, progress: 75 }));
      setState((prev) => ({
        ...prev,
        data: response,
        loading: false,
        progress: 100,
      }));

      if (onSuccess) {
        onSuccess(response);
      }

      return response;
    } catch (err) {
      // Don't set error if request was aborted
      if (err.name !== 'AbortError') {
        setState((prev) => ({
          ...prev,
          error: err,
          loading: false,
          progress: 0,
        }));

        if (onError) {
          onError(err);
        }
      }
      throw err;
    } finally {
      requestInProgress.current = false;
    }
  }, [asyncFunction, onSuccess, onError, state.data]);

  const cancel = useCallback(() => {
    abortController.current.abort();
    requestInProgress.current = false;
    setState((prev) => ({
      ...prev,
      loading: false,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      loading: false,
      data: null,
      error: null,
      progress: 0,
    });
  }, []);

  return {
    ...state,
    execute,
    cancel,
    reset,
    isLoading: state.loading,
  };
};

export default useAsync;
