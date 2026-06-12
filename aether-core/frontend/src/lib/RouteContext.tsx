import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { resolveModule, resolveRouteDensity, type RouteModule } from '@/lib/navigation/routes';
import React from 'react';

export type { RouteModule } from '@/lib/navigation/routes';

export interface RouteContextValue {
  pathname: string;
  module: RouteModule;
  density: 'compact' | 'default';
  workstreamHub: boolean;
}

const RouteContext = createContext<RouteContextValue | null>(null);

export function RouteContextProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  const value = useMemo<RouteContextValue>(
    () => ({
      pathname,
      module: resolveModule(pathname),
      density: resolveRouteDensity(pathname),
      workstreamHub: true,
    }),
    [pathname],
  );

  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
}

export function useRouteContext(): RouteContextValue {
  const ctx = useContext(RouteContext);
  if (!ctx) {
    return {
      pathname: '/command-center',
      module: 'other',
      density: 'default',
      workstreamHub: true,
    };
  }
  return ctx;
}
