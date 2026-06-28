import { cn } from '@/lib/utils';

interface GoalProgressBarProps {
  value: number;
  className?: string;
  showLabel?: boolean;
}

export default function GoalProgressBar({ value, className, showLabel = true }: GoalProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('space-y-1', className)}>
      <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
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
