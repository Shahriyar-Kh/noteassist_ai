// PageContainer.jsx - Reusable Page Layout Container
// Consistent structure for all pages with header, content, and footer

import React from 'react';
import PropTypes from 'prop-types';

const PageContainer = ({
  children,
  maxWidth = 'max-w-7xl',
  padding = true,
  className = '',
  containerClassName = '',
  center = false,
  minHeight = true,
  bgGradient = false,
}) => {
  const bgClass = bgGradient
    ? 'bg-gradient-to-b from-white to-violet-50/30 dark:from-gray-900 dark:to-gray-800'
    : 'bg-white dark:bg-gray-900';

  const minHeightClass = minHeight ? 'min-h-screen' : '';
  const paddingClass = padding ? 'px-4 sm:px-6 lg:px-8' : '';
  const centerClass = center ? 'flex flex-col items-center justify-center' : '';

  return (
    <div className={`${bgClass} ${minHeightClass} transition-colors duration-300 ${containerClassName}`}>
      <div className={`${paddingClass} ${centerClass} ${className}`}>
        <div className={`w-full ${maxWidth} mx-auto`}>
          {children}
        </div>
      </div>
    </div>
  );
};

PageContainer.displayName = 'PageContainer';

PageContainer.propTypes = {
  children: PropTypes.node.isRequired,
  maxWidth: PropTypes.string,
  padding: PropTypes.bool,
  className: PropTypes.string,
  containerClassName: PropTypes.string,
  center: PropTypes.bool,
  minHeight: PropTypes.bool,
  bgGradient: PropTypes.bool,
};

export default PageContainer;
