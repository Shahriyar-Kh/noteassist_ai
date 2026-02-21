// FILE: src/components/common/LoadingButton.jsx
// ============================================================================
// Loading Button Component - Instant visual feedback for all actions
// ============================================================================

import React, { useState } from 'react';
import './LoadingButton.css';
import logger from '@/utils/logger';

/**
 * LoadingButton Component
 * Provides instant visual feedback for button clicks
 * 
 * Props:
 *   - onClick: function to execute on click
 *   - isLoading: boolean indicating loading state
 *   - disabled: boolean to disable button
 *   - variant: 'primary' | 'secondary' | 'danger' | 'success'
 *   - size: 'sm' | 'md' | 'lg'
 *   - loadingText: text to show during loading
 *   - children: button text
 *   - onSuccess: callback after successful completion
 *   - onError: callback on error
 */
const LoadingButton = ({
  onClick,
  isLoading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  loadingText = 'Processing...',
  children,
  onSuccess,
  onError,
  className = '',
  ...props
}) => {
  const [localLoading, setLocalLoading] = useState(false);

  const loading = isLoading || localLoading;

  const handleClick = async (e) => {
    if (loading || disabled) return;

    setLocalLoading(true);

    try {
      // Execute onClick handler
      if (onClick) {
        const result = onClick(e);

        // If it's a promise, await it
        if (result instanceof Promise) {
          await result;
        }
      }

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      logger.error('Button action error:', error);

      // Call error callback
      if (onError) {
        onError(error);
      }
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`loading-button loading-button--${variant} loading-button--${size} ${
        loading ? 'loading-button--loading' : ''
      } ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <span className="loading-button__spinner"></span>
          <span className="loading-button__text">{loadingText}</span>
        </>
      ) : (
        <span className="loading-button__text">{children}</span>
      )}
    </button>
  );
};

export default LoadingButton;
