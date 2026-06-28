import React from 'react';
import { cn } from '@/lib/utils';

export type SkeletonVariant = 'text' | 'block' | 'metric';

export interface SkeletonProps {
  className?: string;
  lines?: number;
  /** When false, renders a static muted block (no shimmer). */
  animate?: boolean;
  variant?: SkeletonVariant;
}

const variantStyles: Record<SkeletonVariant, string> = {
  text: 'h-4 rounded-[var(--radius-md)]',
  block: 'rounded-[var(--radius-md)]',
  metric: 'h-28 rounded-xl',
};

const shimmerClass =
  'bg-muted/60 bg-[length:200%_100%] bg-gradient-to-r from-muted/40 via-muted/80 to-muted/40 motion-safe:animate-skeleton-shimmer';

const staticClass = 'bg-muted/50';

/**
 * Placeholder block while async content loads. Pass `lines` for multi-line text skeletons.
 *
 * @example
 * <Skeleton className="h-32 w-full" />
 * <Skeleton lines={3} />
 */
export function Skeleton({
  className = '',
  lines,
  animate = true,
  variant = 'block',
}: SkeletonProps) {
  const surfaceClass = animate ? shimmerClass : staticClass;

  if (lines) {
    return (
      <div className="space-y-3" aria-hidden="true">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              surfaceClass,
              variantStyles.text,
              i === lines - 1 ? 'w-2/3' : 'w-full',
              className,
            )}
          />
        ))}
      </div>
    );
  }

  return <div className={cn(surfaceClass, variantStyles[variant], className)} aria-hidden="true" />;
}

export default Skeleton;
