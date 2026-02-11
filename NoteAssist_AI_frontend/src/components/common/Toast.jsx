// FILE: src/components/common/Toast.jsx
// ============================================================================
// Toast Notification System - Clean, professional, non-blocking
// ============================================================================

import React, { useEffect, useState } from 'react';
import './Toast.css';

/**
 * Toast Component - Individual notification
 */
const Toast = ({ id, type = 'success', title, message, duration = 5000, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration === Infinity) return;

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(id), 300);
  };

  return (
    <div className={`toast toast--${type} ${isExiting ? 'toast--exiting' : ''}`}>
      <div className="toast__content">
        <div className="toast__header">
          <span className="toast__icon">{getIcon(type)}</span>
          <span className="toast__title">{title}</span>
          <button className="toast__close" onClick={handleClose} aria-label="Close notification">
            ✕
          </button>
        </div>
        {message && <p className="toast__message">{message}</p>}
      </div>
      <div className="toast__progress"></div>
    </div>
  );
};

/**
 * Toast Container - Manages all toasts
 */
const ToastContainer = ({ maxToasts = 5 }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (options) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      type: options.type || 'success',
      title: options.title || 'Notification',
      message: options.message || '',
      duration: options.duration !== undefined ? options.duration : 5000,
    };

    setToasts((prev) => {
      const updated = [toast, ...prev];
      // Keep only maxToasts
      return updated.slice(0, maxToasts);
    });

    return id;
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Expose to global
  if (!window.toastManager) {
    window.toastManager = { addToast };
  }

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={toast.duration}
          onClose={removeToast}
        />
      ))}
    </div>
  );
};

/**
 * Helper function to get toast icon
 */
function getIcon(type) {
  switch (type) {
    case 'success':
      return '✓';
    case 'error':
      return '✕';
    case 'warning':
      return '⚠';
    case 'info':
      return 'ℹ';
    case 'processing':
      return '⟳';
    default:
      return '✓';
  }
}

/**
 * Helper functions for showing toasts from anywhere
 */
export const showToast = {
  success: (message, options = {}) => {
    window.toastManager?.addToast({
      type: 'success',
      title: options.title || '✓ Success',
      message,
      duration: options.duration || 5000,
    });
  },
  error: (message, options = {}) => {
    window.toastManager?.addToast({
      type: 'error',
      title: options.title || '✕ Error',
      message,
      duration: options.duration || 7000,
    });
  },
  warning: (message, options = {}) => {
    window.toastManager?.addToast({
      type: 'warning',
      title: options.title || '⚠ Warning',
      message,
      duration: options.duration || 6000,
    });
  },
  info: (message, options = {}) => {
    window.toastManager?.addToast({
      type: 'info',
      title: options.title || 'ℹ Information',
      message,
      duration: options.duration || 5000,
    });
  },
  processing: (message, options = {}) => {
    return window.toastManager?.addToast({
      type: 'processing',
      title: options.title || 'Processing...',
      message,
      duration: Infinity, // Don't auto-close processing toasts
    });
  },
};

export { Toast, ToastContainer };
export default ToastContainer;
