// FILE: src/components/guards/PublicPageRoute.jsx
// ============================================================================
// Public Page Route Guard - Allows browsing without auth, blocks actions
// ============================================================================

import PropTypes from 'prop-types';

/**
 * PublicPageRoute - Allows users to view public pages without authentication
 * but prevents them from performing actions without logging in.
 * 
 * Usage:
 * <Route path="/notes" element={<PublicPageRoute><NotesPage /></PublicPageRoute>} />
 * <Route path="/ai-tools" element={<PublicPageRoute><AIToolsPage /></PublicPageRoute>} />
 */
const PublicPageRoute = ({ children }) => {
  // ✅ Simply render children - no auth checks
  // Authentication checks happen at the ACTION level, not route level
  return children;
};

PublicPageRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default PublicPageRoute;
