import { type ReactNode } from 'react';
import RouteContextStrip from '@/components/shell/RouteContextStrip';
import { PageHeader } from '@/components/ui/page-header';
import { AsyncBoundary } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface ModulePageLayoutProps {
  title?: string;
  subtitle?: string;
  featureKey?: string;
  testId?: string;
  maxWidth?: '4xl' | '5xl' | '6xl';
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  skeleton?: ReactNode;
  children: ReactNode;
  /** Replaces default PageHeader when module needs a custom header block */
  header?: ReactNode;
  headerExtra?: ReactNode;
  showContextStrip?: boolean;
  /** When false, children render outside AsyncBoundary (page manages its own boundaries) */
  wrapAsync?: boolean;
}

/**
 * Standard module/overview page shell — PageHeader + RouteContextStrip + AsyncBoundary.
 */
export default function ModulePageLayout({
  title,
  subtitle,
  featureKey,
  testId,
  maxWidth = '5xl',
  loading,
  error,
  onRetry,
  skeleton,
  children,
  header,
  headerExtra,
  showContextStrip = true,
  wrapAsync = true,
}: ModulePageLayoutProps) {
  const maxClass =
    maxWidth === '4xl' ? 'max-w-4xl' : maxWidth === '6xl' ? 'max-w-6xl' : 'max-w-5xl';

  const body = wrapAsync ? (
    <AsyncBoundary loading={loading} error={error} onRetry={onRetry} skeleton={skeleton}>
      {children}
    </AsyncBoundary>
  ) : (
    children
  );

  return (
    <div className={cn(maxClass, 'space-y-6')} data-testid={testId}>
      {header ?? (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          {title && <PageHeader title={title} subtitle={subtitle} featureKey={featureKey} />}
          {headerExtra}
        </div>
      )}
      {showContextStrip && <RouteContextStrip />}
      {body}
    </div>
  );
}
