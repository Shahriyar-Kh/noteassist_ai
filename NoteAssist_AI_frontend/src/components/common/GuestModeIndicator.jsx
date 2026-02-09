// Guest Mode Indicator Component
// Shows a badge in the navbar when user is in guest mode
// ============================================================================

import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { UserCircle } from 'lucide-react';

const GuestModeIndicator = () => {
  const { isGuest, guestSession } = useSelector((state) => state.auth);

  if (!isGuest) return null;

  return (
    <Link 
      to="/register"
      className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-500/30 rounded-full hover:border-violet-500/50 transition-all"
      title="Click to create an account"
    >
      <UserCircle className="w-4 h-4 text-violet-600" />
      <span className="text-sm font-medium text-violet-700">
        Guest Mode
      </span>
      {guestSession?.stats && (
        <span className="text-xs text-violet-600/80 ml-1">
          ({guestSession.stats.notes_created}/{guestSession.stats.notes_limit} notes)
        </span>
      )}
    </Link>
  );
};

export default GuestModeIndicator;
