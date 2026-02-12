// FormTextarea.jsx - Textarea Component with Auto-resize
// Production-ready with validation and accessibility

import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { AlertCircle, CheckCircle } from 'lucide-react';

const FormTextarea = React.forwardRef(({
  label = '',
  placeholder = '',
  value = '',
  onChange,
  error = '',
  success = false,
  hint = '',
  disabled = false,
  required = false,
  rows = 4,
  minRows = 3,
  maxRows = 10,
  fullWidth = true,
  className = '',
  autoResize = true,
  ...props
}, ref) => {
  const internalRef = useRef(null);
  const textareaRef = ref || internalRef;

  useEffect(() => {
    if (autoResize && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      const newHeight = Math.min(
        Math.max(textarea.scrollHeight, minRows * 24),
        maxRows * 24
      );
      textarea.style.height = `${newHeight}px`;
    }
  }, [value, autoResize, minRows, maxRows]);

  const baseClasses = `
    w-full rounded-xl border-2 transition-smooth p-4
    bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
    placeholder-gray-400 dark:placeholder-gray-500
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
    disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:cursor-not-allowed
    resize-none font-sans
  `;

  const stateClasses = error
    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
    : success
    ? 'border-green-500 focus:border-green-500 focus:ring-green-500/30'
    : 'border-gray-200 dark:border-gray-700 focus:border-primary-500 focus:ring-primary-500/20';

  const fullWidthClass = fullWidth ? 'w-full' : '';

  const containerClasses = fullWidth ? 'w-full' : '';

  return (
    <div className={`flex flex-col gap-1 ${containerClasses}`}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <textarea
          ref={textareaRef}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          rows={rows}
          className={`
            ${baseClasses}
            ${stateClasses}
            ${className}
          `.replace(/\s+/g, ' ')}
          {...props}
        />

        {/* Status icons */}
        {error && (
          <AlertCircle className="absolute top-3 right-3 w-5 h-5 text-red-500 pointer-events-none" />
        )}
        {success && !error && (
          <CheckCircle className="absolute top-3 right-3 w-5 h-5 text-green-500 pointer-events-none" />
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-1 text-red-500 text-sm font-medium">
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

FormTextarea.displayName = 'FormTextarea';

FormTextarea.propTypes = {
  label: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
  success: PropTypes.bool,
  hint: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  rows: PropTypes.number,
  minRows: PropTypes.number,
  maxRows: PropTypes.number,
  fullWidth: PropTypes.bool,
  className: PropTypes.string,
  autoResize: PropTypes.bool,
};

export default FormTextarea;
