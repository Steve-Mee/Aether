import { type ReactNode } from 'react';
import React from 'react';
import FeatureStatusFromTruth from '@/components/FeatureStatusFromTruth';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  featureKey?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * Consistent page title block for primary merchant screens.
 */
export function PageHeader({ title, subtitle, featureKey, children, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-8', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-headline font-semibold tracking-tight">{title}</h1>
        {featureKey && <FeatureStatusFromTruth featureKey={featureKey} />}
      </div>
      {subtitle && <p className="text-body text-muted-foreground mt-1">{subtitle}</p>}
      {children && <div className="mt-4 flex flex-wrap gap-2">{children}</div>}
    </header>
  );
}

export interface StatChipProps {
  children: ReactNode;
  className?: string;
}

export function StatChip({ children, className }: StatChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg border border-border/35 bg-muted/20 px-3 py-1.5 text-[11px] text-muted-foreground',
        className,
      )}
    >
      {children}
    </span>
  );
}

export default PageHeader;
