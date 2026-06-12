import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthLoadingScreen } from './AuthLoadingScreen';
import { useAuth } from './AuthProvider';
import { LOGIN_PATH } from './adapters/stubAuthAdapter';

/** Protects nested routes — redirects unauthenticated users to login. */
export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AuthLoadingScreen />;
  if (!isAuthenticated) {
    return <Navigate to={LOGIN_PATH} state={{ from: location }} replace />;
  }
  return <Outlet />;
}
