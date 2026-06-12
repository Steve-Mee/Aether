import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { adminRepository } from '@/lib/data';

/**
 * Records sidebar/route navigation for NL adoption metrics (debounced).
 */
export function useNavigationTelemetry(): void {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (location.pathname === lastPath.current) return;
    lastPath.current = location.pathname;

    const timer = setTimeout(() => {
      void adminRepository
        .trackUiEvent({ type: 'navigation', path: location.pathname })
        .catch(() => undefined);
    }, 400);

    return () => clearTimeout(timer);
  }, [location.pathname]);
}
