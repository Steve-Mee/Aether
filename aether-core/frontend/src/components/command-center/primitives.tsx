import { type ReactNode } from 'react';
import React from 'react';
import { cn } from '@/lib/utils';

export function SectionLabel({
  id,
  title,
  subtitle,
}: {
  id?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <h2
        id={id}
        className="text-base font-medium tracking-tight text-foreground"
      >
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground/70">{subtitle}</p>
      )}
    </div>
  );
}

export function ConfidenceHero({
  value,
  label = 'Confidence',
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-4xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/65 leading-relaxed">
        {label}
      </p>
    </div>
  );
}

export function MetricBlock({
  label,
  value,
  subValue,
  tone = 'default',
  align = 'left',
  size = 'default',
}: {
  label: string;
  value: string;
  subValue?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  align?: 'left' | 'right';
  size?: 'default' | 'lg';
}) {
  const toneClass = {
    default: 'text-foreground',
    success: 'text-foreground',
    warning: 'text-foreground',
    danger: 'text-foreground',
  }[tone];

  const valueClass =
    size === 'lg'
      ? 'text-lg font-medium tabular-nums tracking-tight'
      : 'text-base font-medium tabular-nums tracking-tight';

  return (
    <div className={cn('flex-1 min-w-0', align === 'right' && 'text-right')}>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/65 leading-relaxed">
        {label}
      </p>
      <p className={cn('mt-1', valueClass, toneClass)}>{value}</p>
      {subValue && (
        <p className="mt-0.5 text-[10px] text-muted-foreground/65">{subValue}</p>
      )}
    </div>
  );
}

export function MetricZone({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-end gap-0 rounded-xl bg-muted/15 p-4', className)}>
      {children}
    </div>
  );
}

export function StatChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg border border-border/35 bg-muted/20 px-3 py-1.5 text-[11px] text-muted-foreground',
        className
      )}
    >
      {children}
    </span>
  );
}

export function IntentPill({
  label,
  confidence,
  className,
}: {
  label: string;
  confidence: number;
  className?: string;
}) {
  const pct = Math.round(confidence * 100);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border/35 bg-muted/20',
        'px-2.5 py-1 text-[11px] text-muted-foreground',
        className
      )}
    >
      <span className="text-foreground/90">{label}</span>
      <span className="tabular-nums text-muted-foreground/70">{pct}%</span>
    </span>
  );
}

export function SuggestionButton({
  label,
  active,
  onClick,
  className,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-left rounded-xl border px-3 py-2.5 text-sm transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        active
          ? 'border-primary/40 bg-primary/10 text-foreground'
          : 'border-border/30 bg-card/40 text-muted-foreground hover:border-border/50 hover:bg-muted/25 hover:text-foreground',
        className
      )}
    >
      {label}
    </button>
  );
}

export function IconBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/35 text-muted-foreground',
        className
      )}
    >
      {children}
    </div>
  );
}
