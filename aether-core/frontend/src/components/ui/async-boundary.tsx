import { type ReactNode } from 'react';
import React from 'react';
import { Skeleton } from './Skeleton';
import { ErrorState } from './error-state';

export interface AsyncBoundaryProps {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  skeleton?: ReactNode;
  children: ReactNode;
}

/**
 * Standard async data wrapper: skeleton while loading, retry on error, children on success.
 * Prefer page-specific skeletons via the `skeleton` prop for layout-accurate loading.
 *
 * @example
 * <AsyncBoundary loading={loading} error={error} onRetry={reload} skeleton={<ApprovalsPageSkeleton />}>
 *   <OrderList orders={data} />
 * </AsyncBoundary>
 */
export function AsyncBoundary({ loading, error, onRetry, skeleton, children }: AsyncBoundaryProps) {
  if (loading) {
    return (
      skeleton ?? (
        <div className="space-y-4 animate-fade-in" aria-busy="true">
          <Skeleton className="h-8 w-48" variant="text" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  return <>{children}</>;
}

export default AsyncBoundary;
