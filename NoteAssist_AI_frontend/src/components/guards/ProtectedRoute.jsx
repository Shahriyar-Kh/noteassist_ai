// FILE: src/components/guards/ProtectedRoute.jsx - FIXED VERSION WITH GUEST SUPPORT
// ============================================================================

import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';

const ProtectedRoute = ({ children, allowedRoles = [], allowGuest = false }) => {
  // Check for guest mode
  const isGuest = localStorage.getItem('isGuest') === 'true';
  
  // If guest mode is allowed for this route, let them through
  if (allowGuest && isGuest) {
    console.log('[ProtectedRoute] Guest access allowed for this route');
    return children;
  }
  
  // If guest but not allowed, redirect to login with message
  if (isGuest && !allowGuest) {
    console.log('[ProtectedRoute] Guest trying to access protected route, redirecting to login');
    return <Navigate to="/login" state={{ message: 'Please login or register to access this page.' }} replace />;
  }

  // Check authentication
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  // If no token, redirect to login
  if (!token) {
    console.log('[ProtectedRoute] No token found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // If no user data, redirect to login
  if (!userStr) {
    console.log('[ProtectedRoute] No user data found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    console.log('[ProtectedRoute] User:', user);
    console.log('[ProtectedRoute] Allowed roles:', allowedRoles);
    
    // If no role restrictions, allow access to all authenticated users
    if (allowedRoles.length === 0) {
      console.log('[ProtectedRoute] No role restrictions, allowing access');
      return children;
    }

    // Determine user's effective role
    let userRole = user.role || 'student'; // Default to 'student' if role not set
    
    // Handle admin checks - staff or superuser are admins
    if (user.is_staff || user.is_superuser) {
      userRole = 'admin';
    }

    console.log('[ProtectedRoute] User role:', userRole);

    // Check if user's role is in allowed roles
    if (allowedRoles.includes(userRole)) {
      console.log('[ProtectedRoute] Role authorized, allowing access');
      return children;
    } else {
      // User doesn't have required role - redirect to appropriate dashboard
      console.log('[ProtectedRoute] Role not authorized, redirecting');
      const redirectTo = userRole === 'admin' ? '/admin-dashboard' : '/dashboard';
      return <Navigate to={redirectTo} replace />;
    }

  } catch (error) {
    console.error('[ProtectedRoute] Error parsing user data:', error);
    // Clear corrupted data
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    return <Navigate to="/login" replace />;
  }
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
  allowGuest: PropTypes.bool,
};

export default ProtectedRoute;