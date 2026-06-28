import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import type { GoalStatus } from '@/types/goals';

export type GoalProgressHealth = 'on_track' | 'behind' | 'completed' | 'paused' | 'abandoned';

interface GoalStatusBadgeProps {
  status: GoalStatus;
  progressPct?: number | null;
  className?: string;
}

function resolveHealth(status: GoalStatus, progressPct?: number | null): GoalProgressHealth {
  if (status === 'completed') return 'completed';
  if (status === 'paused') return 'paused';
  if (status === 'abandoned') return 'abandoned';
  const pct = progressPct ?? 0;
  if (pct < 50) return 'behind';
  return 'on_track';
}

const healthStyles: Record<GoalProgressHealth, string> = {
  on_track: 'bg-success/15 text-success border-success/30',
  behind: 'bg-warning/15 text-warning border-warning/30',
  completed: 'bg-success/15 text-success border-success/30',
  paused: 'bg-muted/50 text-muted-foreground border-border/40',
  abandoned: 'bg-muted/30 text-muted-foreground border-border/30',
};

const healthKeys: Record<GoalProgressHealth, string> = {
  on_track: 'goals.status.onTrack',
  behind: 'goals.status.behind',
  completed: 'goals.status.completed',
  paused: 'goals.status.paused',
  abandoned: 'goals.status.abandoned',
};

export default function GoalStatusBadge({ status, progressPct, className }: GoalStatusBadgeProps) {
  const health = resolveHealth(status, progressPct);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        healthStyles[health],
        className,
      )}
      data-goal-health={health}
    >
      {t(healthKeys[health])}
    </span>
  );
}

export { resolveHealth };
