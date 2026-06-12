import React, { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  hint?: string;
  icon?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'premium';
  className?: string;
}

/**
 * Calm empty surface when no data is available.
 * Use `premium` variant for dashed-border hero empty states on primary pages.
 *
 * @example
 * <EmptyState variant="premium" title="Geen items" actionLabel="Start" onAction={openPalette} />
 */
export function EmptyState({
  title,
  description,
  hint,
  icon,
  action,
  secondaryAction,
  actionLabel,
  onAction,
  variant = 'default',
  className,
  ...props
}: EmptyStateProps) {
  const isPremium = variant === 'premium';

  return (
    <div
      {...props}
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in',
        isPremium && 'rounded-[var(--radius-xl)] border border-dashed border-border/40 bg-card/50',
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            'mb-4 flex items-center justify-center',
            isPremium && 'rounded-full bg-primary/5 p-4 text-primary opacity-90',
          )}
        >
          <span className={cn(!isPremium && 'text-muted-foreground')}>{icon}</span>
        </div>
      )}
      <h3 className="text-title font-medium text-foreground tracking-tight">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-2 max-w-md">{description}</p>}
      {hint && <p className="text-caption text-muted-foreground mt-3 max-w-sm">{hint}</p>}
      {(action || actionLabel) && (
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
          {action}
          {!action && actionLabel && onAction && (
            <Button variant="secondary" size="md" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
      {secondaryAction && <div className="mt-3">{secondaryAction}</div>}
    </div>
  );
}

export default EmptyState;
