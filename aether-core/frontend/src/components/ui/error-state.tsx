import { AlertCircle } from 'lucide-react';
import React, { type ReactNode } from 'react';
import { Button } from './Button';
import { Card, CardContent } from './Card';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string;
  title?: string;
  hint?: string;
  onRetry?: () => void;
  children?: ReactNode;
}

/**
 * Premium inline error surface — shared by AsyncBoundary, command flows, and page banners.
 */
export function ErrorState({
  message,
  title,
  hint,
  onRetry,
  className,
  children,
  ...props
}: ErrorStateProps) {
  return (
    <Card
      variant="elevated"
      padding="md"
      role="alert"
      className={cn('border-border/40 animate-fade-in', className)}
      {...props}
    >
      <CardContent className="p-0 flex flex-col items-center text-center gap-4 py-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle size={20} strokeWidth={1.75} aria-hidden />
        </span>
        <div>
          <p className="text-body font-medium text-foreground">{title ?? t('async.error')}</p>
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
          {hint && <p className="text-caption text-muted-foreground/80 mt-1">{hint}</p>}
        </div>
        {children}
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {t('async.retry')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default ErrorState;
