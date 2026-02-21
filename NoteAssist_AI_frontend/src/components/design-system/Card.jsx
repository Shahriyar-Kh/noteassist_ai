// Card.jsx - Comprehensive Card Component with Variants
// Supports multiple layouts, hover effects, and styling options

import React from 'react';
const MemoCard = React.memo(Card);
import PropTypes from 'prop-types';

const Card = ({
  children,
  variant = 'default',
  hover = false,
  clickable = false,
  className = '',
  padding = true,
  onClick,
  header = null,
  footer = null,
  ...props
}) => {
  const baseClasses = `
    bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 
    dark:border-gray-700 transition-smooth overflow-hidden
  `;

  const variantClasses = {
    default: '',
    elevated: 'shadow-md hover:shadow-lg',
    outlined: 'border-2',
    gradient: 'border-0 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900',
    ghost: 'bg-transparent border-0',
    flat: 'bg-gray-50 dark:bg-gray-800/50 border-0',
  };

  const interactiveClasses = clickable
    ? 'cursor-pointer hover:border-primary-500 hover:scale-105'
    : hover
    ? 'hover:shadow-xl hover:border-primary-500/50'
    : '';

  const paddingClass = padding ? 'p-6 md:p-8' : '';

  return (
    <div
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${interactiveClasses}
        ${paddingClass}
        ${className}
      `.replace(/\s+/g, ' ')}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      {...props}
    >
      {header && (
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
          {header}
        </div>
      )}

      <div className="card-content">
        {children}
      </div>

      {footer && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          {footer}
        </div>
      )}
    </div>
  );
};

Card.displayName = 'Card';

Card.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf([
    'default', 'elevated', 'outlined', 'gradient', 'ghost', 'flat'
  ]),
  hover: PropTypes.bool,
  clickable: PropTypes.bool,
  className: PropTypes.string,
  padding: PropTypes.bool,
  onClick: PropTypes.func,
  header: PropTypes.node,
  footer: PropTypes.node,
};

export default MemoCard;
