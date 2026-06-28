import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';

export interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

/** Inline loading indicator for buttons and compact areas. */
export function Spinner({ className, size = 'md', label }: SpinnerProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)} role="status">
      <Loader2 className={cn('animate-spin text-muted-foreground', sizeMap[size])} />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </span>
  );
}

export interface LoadingStateProps {
  message?: string;
  showSpinner?: boolean;
  className?: string;
}

/** Centered loading placeholder for page sections. */
export function LoadingState({ message, showSpinner = false, className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 gap-3', className)}>
      {showSpinner && <Spinner size="lg" />}
      <p className="text-sm text-muted-foreground">{message ?? t('async.loading')}</p>
    </div>
  );
}

export default LoadingState;
