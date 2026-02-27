// FILE: src/hooks/useAuthHydration.js
// ============================================================================
// FIXED: Auth Hydration with session restoration + logout event listener
// ============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { login, logout, startGuestSession } from '@/store/slices/authSlice';
import { authService } from '@/services/auth.service';
import logger from '@/utils/logger';

export const useAuthHydration = () => {
  const dispatch = useDispatch();
  const hasHydrated = useRef(false);
  const [isHydrating, setIsHydrating] = useState(true);

  // ── Handle forced logout from API interceptor ────────────────────────────────
  const handleForcedLogout = useCallback(
    (event) => {
      const reason = event?.detail?.reason || 'unknown';
      logger.warn(`[useAuthHydration] Forced logout received: ${reason}`);
      dispatch(logout());
    },
    [dispatch]
  );

  // ── Listen for auth:logout events dispatched by the API interceptor ──────────
  useEffect(() => {
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, [handleForcedLogout]);

  // ── Hydrate on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (hasHydrated.current) return;
    hasHydrated.current = true;

    const hydrateAuth = async () => {
      try {
        logger.info('[useAuthHydration] Starting auth hydration...');

        const storedUser = authService.getStoredUser();
        const isAuth = authService.isAuthenticated();

        if (isAuth && storedUser) {
          logger.info('[useAuthHydration] Restoring user session:', storedUser.email);

          // Restore the proactive refresh scheduler
          authService.restoreSession();

          dispatch(
            login.fulfilled(
              {
                user: storedUser,
                access: authService.getAccessToken(),
                refresh: authService.getRefreshToken(),
                redirect: authService.getRedirectUrl(),
              },
              '',
              {}
            )
          );

          // Silently validate session in background (optional)
          authService.getCurrentUser().catch((err) => {
            logger.warn('[useAuthHydration] Background user validation failed:', err.message);
            // Don't log out - the token interceptor will handle 401 if truly expired
          });
        } else if (authService.isGuest()) {
          logger.info('[useAuthHydration] Restoring guest session');
          const guestSession = authService.getStoredGuestSession();
          dispatch(startGuestSession.fulfilled(guestSession, '', {}));
        } else {
          logger.info('[useAuthHydration] No session found - fresh visitor');
        }
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