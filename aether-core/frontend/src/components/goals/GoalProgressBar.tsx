import { cn } from '@/lib/utils';

export type GoalProgressVariant = 'default' | 'behind' | 'completed';

interface GoalProgressBarProps {
  value: number;
  className?: string;
  showLabel?: boolean;
  variant?: GoalProgressVariant;
  showMilestones?: boolean;
}

const fillStyles: Record<GoalProgressVariant, string> = {
  default: 'bg-primary',
  behind: 'bg-warning',
  completed: 'bg-success',
};

export default function GoalProgressBar({
  value,
  className,
  showLabel = true,
  variant = 'default',
  showMilestones = false,
}: GoalProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));

  return (
    <div className={cn('space-y-1', className)}>
      <div className="relative h-2 rounded-full bg-muted/60 overflow-hidden">
        {showMilestones && (
          <>
            <span className="absolute left-[25%] top-0 bottom-0 w-px bg-border/40 z-[1]" aria-hidden />
            <span className="absolute left-[50%] top-0 bottom-0 w-px bg-border/40 z-[1]" aria-hidden />
            <span className="absolute left-[75%] top-0 bottom-0 w-px bg-border/40 z-[1]" aria-hidden />
          </>
        )}
        <div
          className={cn('h-full rounded-full transition-all duration-500', fillStyles[variant])}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel ? (
        <p className="text-xs text-muted-foreground tabular-nums">{Math.round(pct)}%</p>
      ) : null}
    </div>
  );
}
