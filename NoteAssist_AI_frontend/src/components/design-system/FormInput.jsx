// FormInput.jsx - Comprehensive Form Input Component
// Supports validation, error states, icons, and accessibility

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

const FormInput = React.forwardRef(({
  label = '',
  type = 'text',
  placeholder = '',
  value = '',
  onChange,
  error = '',
  success = false,
  hint = '',
  disabled = false,
  required = false,
  icon: Icon = null,
  size = 'md',
  fullWidth = true,
  className = '',
  autoComplete = 'off',
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-5 py-4 text-lg',
  };

  const baseClasses = `
    w-full rounded-xl border-2 transition-smooth
    bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
    placeholder-gray-400 dark:placeholder-gray-500
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
    disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:cursor-not-allowed
  `;

  const stateClasses = error
    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
    : success
    ? 'border-green-500 focus:border-green-500 focus:ring-green-500/30'
    : 'border-gray-200 dark:border-gray-700 focus:border-primary-500 focus:ring-primary-500/20';

  const fullWidthClass = fullWidth ? 'w-full' : '';

  const inputType = type === 'password' && showPassword ? 'text' : type;

  const containerClasses = fullWidth ? 'w-full' : '';

  return (
    <div className={`flex flex-col gap-1 ${containerClasses}`}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <Icon className="absolute left-3 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
        )}

        <input
          ref={ref}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`
            ${baseClasses}
            ${sizeClasses[size]}
            ${stateClasses}
            ${Icon ? 'pl-10' : ''}
            ${className}
          `.replace(/\s+/g, ' ')}
          {...props}
        />

        {/* Password visibility toggle */}
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Status icons */}
        {error && (
          <AlertCircle className="absolute right-3 w-5 h-5 text-red-500 pointer-events-none" />
        )}
        {success && !error && (
          <CheckCircle className="absolute right-3 w-5 h-5 text-green-500 pointer-events-none" />
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-1 text-red-500 text-sm font-medium animate-in">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Hint text */}
      {hint && !error && (
        <p className="form-hint">{hint}</p>
      )}
    </div>
  );
});

FormInput.displayName = 'FormInput';

FormInput.propTypes = {
  label: PropTypes.string,
  type: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  error: PropTypes.string,
  success: PropTypes.bool,
  hint: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  icon: PropTypes.elementType,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  fullWidth: PropTypes.bool,
  className: PropTypes.string,
  autoComplete: PropTypes.string,
};

export default FormInput;
