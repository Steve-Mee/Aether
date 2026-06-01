import { createContext, useContext, type ReactNode } from 'react';
import { useDashboardStream } from './useDashboardStream';
import type { DashboardSummary } from './api';
import React from 'react';

interface DashboardContextValue {
  data: DashboardSummary | null;
  connected: boolean;
  error: string | null;
  reload: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { data, connected, error, reload } = useDashboardStream();

  return (
    <DashboardContext.Provider value={{ data, connected, error, reload }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}
