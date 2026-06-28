import { useState, type ReactNode } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { CriticalErrorDialog } from './CriticalErrorDialog';

interface AppErrorShellProps {
  children: ReactNode;
}

/** App-root error boundary with optional critical error dialog. */
export function AppErrorShell({ children }: AppErrorShellProps) {
  const [criticalOpen, setCriticalOpen] = useState(false);

  return (
    <>
      <ErrorBoundary name="app" onCaught={() => setCriticalOpen(true)}>
        {children}
      </ErrorBoundary>
      <CriticalErrorDialog open={criticalOpen} onDismiss={() => setCriticalOpen(false)} />
    </>
  );
}

export default AppErrorShell;
