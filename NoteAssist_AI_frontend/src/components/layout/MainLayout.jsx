// FILE: src/components/layout/MainLayout.jsx
// ============================================================================
// Main Layout Wrapper - Provides consistent layout with Navbar for all pages
// ============================================================================

import Navbar from './Navbar';
import PropTypes from 'prop-types';

/**
 * MainLayout - Wraps all pages with common layout (Navbar, etc.)
 * 
 * Usage:
 * <MainLayout>
 *   <YourPage />
 * </MainLayout>
 */
const MainLayout = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      {/* Navbar - Always visible (handles its own visibility logic) */}
      <Navbar />
      
      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {children}
      </main>
      
      {/* Optional: Footer could go here */}
      {/* <Footer /> */}
    </div>
  );
};

MainLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default MainLayout;
