// Button.jsx - Comprehensive Button Component with Variants
// Production-ready with loading states, sizes, and animations

import React from 'react';
import PropTypes from 'prop-types';
import { Loader } from 'lucide-react';

const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon = null,
  iconPosition = 'left',
  className = '',
  onClick,
  type = 'button',
  ...props
}, ref) => {
  // Base classes
  const baseClasses = `
    font-semibold rounded-xl transition-smooth inline-flex items-center justify-center gap-2 
    no-tap-highlight focus-visible:outline-2 focus-visible:outline-offset-2 
    focus-visible:outline-primary-500 disabled:opacity-70 disabled:cursor-not-allowed
  `;

  // Size variants
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    xl: 'px-10 py-5 text-xl',
  };

  // Color variants
  const variantClasses = {
    primary: `
      bg-gradient-to-r from-primary-600 to-blue-600 text-white
      hover:shadow-lg hover:shadow-primary-500/50 hover:scale-105 active:scale-95
      disabled:hover:scale-100 disabled:hover:shadow-none
    `,
    secondary: `
      bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
      border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 
      hover:text-primary-600 dark:hover:text-primary-400
    `,
    success: `
      bg-emerald-500 hover:bg-emerald-600 text-white
      hover:shadow-lg hover:shadow-emerald-500/50 active:scale-95
    `,
    danger: `
      bg-red-500 hover:bg-red-600 text-white
      hover:shadow-lg hover:shadow-red-500/50 active:scale-95
    `,
    warning: `
      bg-amber-500 hover:bg-amber-600 text-white
      hover:shadow-lg hover:shadow-amber-500/50 active:scale-95
    `,
    info: `
      bg-blue-500 hover:bg-blue-600 text-white
      hover:shadow-lg hover:shadow-blue-500/50 active:scale-95
    `,
    ghost: `
      text-gray-700 dark:text-gray-300 hover:bg-gray-100 
      dark:hover:bg-gray-800
    `,
    outline: `
      bg-transparent border-2 border-primary-500 text-primary-600 
      dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20
    `,
  };

  const fullWidthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${fullWidthClass}
        ${className}
      `.replace(/\s+/g, ' ')}
      {...props}
    >
      {isLoading && <Loader className="w-5 h-5 animate-spin" />}
      
      {!isLoading && Icon && iconPosition === 'left' && (
        <Icon className="w-5 h-5" />
      )}
      
      <span>{children}</span>
      
      {!isLoading && Icon && iconPosition === 'right' && (
        <Icon className="w-5 h-5" />
      )}
    </button>
  );
});

Button.displayName = 'Button';

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf([
    'primary', 'secondary', 'success', 'danger', 'warning', 'info', 'ghost', 'outline'
  ]),
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  isLoading: PropTypes.bool,
  disabled: PropTypes.bool,
  fullWidth: PropTypes.bool,
  icon: PropTypes.elementType,
  iconPosition: PropTypes.oneOf(['left', 'right']),
  className: PropTypes.string,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
};

export default React.memo(Button);
