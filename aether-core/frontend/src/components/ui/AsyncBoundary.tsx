import { type ReactNode } from 'react';
import React from 'react';
import Skeleton from './Skeleton';
import Button from './Button';
import { t } from '../../lib/i18n';

interface AsyncBoundaryProps {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  skeleton?: ReactNode;
  children: ReactNode;
}

export default function AsyncBoundary({
  loading,
  error,
  onRetry,
  skeleton,
  children,
}: AsyncBoundaryProps) {
  if (loading) {
    return (
      skeleton ?? (
        <div className="space-y-4 p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center" role="alert">
        <p className="text-red-400 mb-4">{t('async.error')}: {error}</p>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {t('async.retry')}
          </Button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
