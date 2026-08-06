import { Navigate, Outlet } from 'react-router-dom';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import { AuthLoadingScreen } from './AuthLoadingScreen';

/** Soft redirect to first-run onboarding until merchant completes or skips it. */
export function RequireOnboardingComplete() {
  const { settings, loading } = useMerchantSettings();

  if (loading) return <AuthLoadingScreen />;
  if (!settings.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
