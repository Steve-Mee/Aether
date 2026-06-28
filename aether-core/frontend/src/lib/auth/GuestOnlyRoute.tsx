import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { COMMAND_CENTER_PATH } from '@/lib/navigation/routes';
import { AuthLoadingScreen } from './AuthLoadingScreen';
import { useAuth } from './AuthProvider';

/** Guest-only routes (e.g. login) — redirect authenticated users away. */
export function GuestOnlyRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AuthLoadingScreen />;

  if (isAuthenticated) {
    const from = location.state as { from?: { pathname?: string } } | null;
    const target = from?.from?.pathname ?? COMMAND_CENTER_PATH;
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
}
