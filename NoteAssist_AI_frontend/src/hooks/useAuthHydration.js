// FILE: src/hooks/useAuthHydration.js
// ============================================================================
// Auth Hydration Hook - Syncs Redux state with localStorage on app mount
// Ensures auth state is always in sync across browser sessions
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { login, startGuestSession } from '@/store/slices/authSlice';
import { authService } from '@/services/auth.service';
import logger from '@/utils/logger';

/**
 * useAuthHydration
 * 
 * Hydrates Redux auth state from localStorage on app mount.
 * This ensures:
 * - Auth state is properly initialized from localStorage
 * - Redux store stays in sync with localStorage
 * - Guests are properly handled
 * - No delays when reading stored auth data
 * 
 * @returns {object} Hydration status
 */
export const useAuthHydration = () => {
  const dispatch = useDispatch();
  const hasHydrated = useRef(false);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    // Prevent double hydration (React 18 strict mode)
    if (hasHydrated.current) return;
    hasHydrated.current = true;

    const hydrateAuth = async () => {
      try {
        logger.info('[useAuthHydration] Starting auth hydration...');

        // Check if user is logged in
        const storedUser = authService.getStoredUser();
        const isAuth = authService.isAuthenticated();

        if (isAuth && storedUser) {
          logger.info('[useAuthHydration] User found in localStorage:', storedUser.email);
          
          // Dispatch login to update Redux state
          // Create a synthetic login payload that matches the auth action format
          dispatch(login.fulfilled({
            user: storedUser,
            access: localStorage.getItem('accessToken'),
            refresh: localStorage.getItem('refreshToken'),
            redirect: authService.getRedirectUrl(),
          }, '', {}));
        }
        // Check if guest session exists
        else if (authService.isGuest()) {
          logger.info('[useAuthHydration] Guest session found in localStorage');
          const guestSession = authService.getStoredGuestSession();
          
          // Dispatch guest session to update Redux state
          dispatch(startGuestSession.fulfilled(guestSession, '', {}));
        }
        // No auth data - user is a fresh visitor
        else {
          logger.info('[useAuthHydration] No auth data found - fresh visitor');
        }

        logger.info('[useAuthHydration] Hydration complete');
      } catch (error) {
        logger.error('[useAuthHydration] Error during hydration:', error);
      } finally {
        setIsHydrating(false);
      }
    };

    hydrateAuth();
  }, [dispatch]);

  return { isHydrating };
};

export default useAuthHydration;
