import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useCurrentTenant, useCurrentUser } from '@/lib/auth';
import { useRouteContext } from '@/lib/RouteContext';
import { setObservabilityContext } from '@/lib/observability/errorReporter';

/** Must render inside Router + AuthProvider + RouteContextProvider. */
export default function ObservabilityBridge() {
  const user = useCurrentUser();
  const tenantId = useCurrentTenant();
  const { pathname, module } = useRouteContext();
  const location = useLocation();

  useEffect(() => {
    setObservabilityContext({
      userId: user?.id ?? null,
      tenantId: tenantId ?? null,
      module: module ?? null,
      pathname: location.pathname,
    });
  }, [user?.id, tenantId, module, location.pathname]);

  return null;
}
