import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { Suspense } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';

import AppShell from './components/AppShell';

import OverviewLayout from './components/layouts/OverviewLayout';

import DeepModuleLayout from './components/layouts/DeepModuleLayout';

import SettingsLayout from './components/layouts/SettingsLayout';

import RouteFallback from './components/navigation/RouteFallback';

import ErrorBoundary from './components/ErrorBoundary';
import { AppErrorShell } from './components/AppErrorShell';
import { useNavigate } from 'react-router-dom';

import NavigationTelemetryBridge from './components/NavigationTelemetryBridge';
import ObservabilityBridge from './components/ObservabilityBridge';

import NavigationBridge from './components/NavigationBridge';

import QueryInvalidationBridge from './lib/query/QueryInvalidationBridge';

import { CommandProvider } from './lib/CommandContext';

import { DashboardProvider } from './lib/DashboardContext';

import { NotificationProvider } from './lib/notifications/NotificationContext';

import { MerchantSettingsProvider } from './lib/settings/MerchantSettingsContext';

import { LocaleProvider } from './lib/settings/LocaleProvider';

import { RouteContextProvider } from './lib/RouteContext';

import { AuthProvider } from './lib/auth/AuthProvider';

import { GuestOnlyRoute } from './lib/auth/GuestOnlyRoute';

import { ProtectedRoute } from './lib/auth/ProtectedRoute';

import { LOGIN_PATH } from './lib/auth/adapters/stubAuthAdapter';

import { queryClient } from './lib/query/client';

import { env } from './lib/config';

import {
  getLazyPage,
  getRedirectRoutes,
  getRoutesByLayout,
  notFoundPage,
  type AppRouteDefinition,
  type RouteLayout,
} from './lib/navigation/appRoutes';

import LiveDemoOrchestrator from './lib/liveDemo/LiveDemoOrchestrator';
import { LiveAnnouncerProvider } from './components/a11y/LiveAnnouncer';

import { Toaster } from '@/components/ui';

import React from 'react';

const LoginPage = React.lazy(() => import('./pages/LoginPage'));

const ReactQueryDevtools = React.lazy(() =>
  import('@tanstack/react-query-devtools').then((m) => ({
    default: m.ReactQueryDevtools,
  })),
);

function RoutePageWithBoundary({ Page }: { Page: React.ComponentType<object> }) {
  const navigate = useNavigate();
  return (
    <ErrorBoundary name="module" onGoHome={() => navigate('/command-center')}>
      <Page />
    </ErrorBoundary>
  );
}

function renderLayoutRoutes(layout: RouteLayout) {
  return getRoutesByLayout(layout).map((route: AppRouteDefinition) => {
    const Page = getLazyPage(route.path);

    if (!Page) return null;

    return (
      <Route key={route.path} path={route.path} element={<RoutePageWithBoundary Page={Page} />} />
    );
  });
}

function AppRoutes() {
  const redirects = getRedirectRoutes();

  const NotFound = notFoundPage;

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<GuestOnlyRoute />}>
          <Route
            path={LOGIN_PATH}
            element={
              <ErrorBoundary name="login">
                <LoginPage />
              </ErrorBoundary>
            }
          />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route element={<OverviewLayout />}>{renderLayoutRoutes('overview')}</Route>

            <Route element={<DeepModuleLayout />}>{renderLayoutRoutes('deep')}</Route>

            <Route element={<SettingsLayout />}>{renderLayoutRoutes('settings')}</Route>

            {redirects.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={<Navigate to={route.redirectTo!} replace />}
              />
            ))}

            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouteContextProvider>
            <NavigationTelemetryBridge />

            <ObservabilityBridge />

            <NavigationBridge />

            <QueryInvalidationBridge />

            <MerchantSettingsProvider>
              <LocaleProvider>
                <NotificationProvider>
                  <LiveAnnouncerProvider>
                    <LiveDemoOrchestrator />

                    <CommandProvider>
                      <DashboardProvider>
                        <AppErrorShell>
                          <AppRoutes />
                        </AppErrorShell>

                        <Toaster />
                      </DashboardProvider>
                    </CommandProvider>
                  </LiveAnnouncerProvider>
                </NotificationProvider>
              </LocaleProvider>
            </MerchantSettingsProvider>
          </RouteContextProvider>
        </AuthProvider>

        {env.isDev && (
          <Suspense fallback={null}>
            <ReactQueryDevtools initialIsOpen={false} />
          </Suspense>
        )}
      </QueryClientProvider>
    </Router>
  );
}

export default App;
