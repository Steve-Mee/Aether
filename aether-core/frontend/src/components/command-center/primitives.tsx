import { Check, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { type ReactNode } from 'react';
import React from 'react';
import { type ActionExecutionMode, autonomyLabel } from '@/lib/actionAutonomy';
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
      <h2 id={id} className="text-base font-medium tracking-tight text-foreground">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
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
      <p className="text-[10px] uppercase tracking-widest text-caption-accessible leading-relaxed">
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
      <p className="text-[10px] uppercase tracking-widest text-caption-accessible leading-relaxed">
        {label}
      </p>
      <p className={cn('mt-1', valueClass, toneClass)}>{value}</p>
      {subValue && <p className="mt-0.5 text-[10px] text-caption-accessible">{subValue}</p>}
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
        className,
      )}
    >
      {children}
    </span>
  );
}

export function AutonomyModeBadge({
  mode,
  className,
}: {
  mode: ActionExecutionMode;
  className?: string;
}) {
  const styles: Record<ActionExecutionMode, string> = {
    autonomous: 'border-success/40 bg-success/25 text-emerald-300',
    approval_required: 'border-warning/40 bg-warning/25 text-amber-200',
    inform_only: 'border-border/35 bg-muted/20 text-muted-foreground',
  };
  const Icon = mode === 'autonomous' ? Zap : mode === 'approval_required' ? ShieldCheck : Sparkles;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider',
        styles[mode],
        className,
      )}
    >
      <Icon size={11} strokeWidth={1.75} />
      {autonomyLabel(mode)}
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
        className,
      )}
    >
      <span className="text-foreground/90">{label}</span>
      <span className="tabular-nums text-muted-foreground">{pct}%</span>
    </span>
  );
}

export function SuggestionButton({
  id,
  suggestionId,
  label,
  description,
  executionMode,
  active,
  selected,
  onClick,
  className,
}: {
  id?: string;
  /** Stable id for E2E (`pricing-week`, etc.) */
  suggestionId?: string;
  label: string;
  description?: string;
  executionMode?: ActionExecutionMode;
  active?: boolean;
  selected?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      data-testid={suggestionId ? `command-suggestion-${suggestionId}` : undefined}
      role="option"
      aria-selected={selected ?? active ?? false}
      onClick={onClick}
      className={cn(
        'text-left rounded-xl border px-3 py-2.5 transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        selected && 'border-l-2 border-l-primary/70 pl-[calc(0.75rem-1px)]',
        active
          ? 'border-primary/40 bg-primary/10 text-foreground'
          : 'border-border/30 bg-card/40 text-foreground hover:border-border/50 hover:bg-muted/25',
        selected && !active && 'bg-muted/20',
        className,
      )}
    >
      {executionMode && (
        <span className="mb-1.5 block">
          <AutonomyModeBadge mode={executionMode} />
        </span>
      )}
      <span className={cn('block text-sm', description && 'font-medium')}>{label}</span>
      {description && (
        <span className="mt-0.5 block text-[11px] leading-relaxed text-caption-accessible">
          {description}
        </span>
      )}
    </button>
  );
}

export function StepProgressRail({
  stepIndex,
  stepTotal,
  className,
}: {
  stepIndex: number;
  stepTotal: number;
  className?: string;
}) {
  if (stepTotal < 1) return null;
  const current = Math.min(stepIndex, stepTotal);
  return (
    <div
      className={cn('flex items-center gap-2', className)}
      data-testid="compound-step-rail"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={stepTotal}
    >
      {Array.from({ length: stepTotal }, (_, i) => {
        const done = i < current;
        const active = i === current - 1 && stepIndex > 0;
        return (
          <div key={i} className="flex flex-1 items-center gap-2 min-w-0">
            <div
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium transition-colors duration-200',
                done
                  ? 'border-success/40 bg-success/15 text-success'
                  : active
                    ? 'border-primary/50 bg-primary/15 text-foreground'
                    : 'border-border/40 bg-muted/20 text-caption-accessible',
              )}
            >
              {done ? <Check size={12} strokeWidth={2} /> : i + 1}
            </div>
            {i < stepTotal - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 rounded-full transition-colors duration-300',
                  done ? 'bg-success/35' : 'bg-border/30',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CompoundStepTimeline({
  steps,
  className,
}: {
  steps: { label: string; summary: string; done: boolean; checkpoint?: boolean }[];
  className?: string;
}) {
  return (
    <ul className={cn('space-y-2 border-t border-border/20 pt-3', className)}>
      {steps.map((step, index) => (
        <li
          key={`${step.label}-${index}`}
          className={cn(
            'flex items-start gap-2 text-sm',
            step.checkpoint && 'rounded-md border border-amber-500/25 bg-amber-500/5 px-2 py-1',
          )}
          data-testid={step.checkpoint ? 'agent-timeline-checkpoint' : undefined}
        >
          <Check
            size={14}
            className={cn(
              'mt-0.5 shrink-0',
              step.checkpoint
                ? 'text-amber-500'
                : step.done
                  ? 'text-success'
                  : 'text-caption-accessible',
            )}
          />
          <span>
            <span className="font-medium text-foreground/90">{step.label}</span>
            <span className="text-caption-accessible"> — {step.summary}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function IconBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/35 text-muted-foreground',
        className,
      )}
    >
      {children}
    </div>
  );
}
