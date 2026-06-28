import { Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import { Button, Card, CardContent, EmptyState } from '@/components/ui';
import GoalProgressBar from '@/components/goals/GoalProgressBar';
import { GoalStatusBadge, resolveHealth } from '@/components/intelligence';
import { SectionLabel } from '@/components/command-center/primitives';
import { formatDate, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { MerchantGoal } from '@/types/goals';

interface OverviewGoalsSectionProps {
  goals: MerchantGoal[];
}

export default function OverviewGoalsSection({ goals }: OverviewGoalsSectionProps) {
  return (
    <section data-testid="overview-goals-section">
      <div className="flex items-center justify-between gap-3 mb-4">
        <SectionLabel title={t('overview.section.goals')} />
        <Button variant="ghost" size="sm" asChild>
          <Link to="/goals">{t('overview.section.goals.viewAll')}</Link>
        </Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          variant="premium"
          icon={<Target size={24} strokeWidth={1.5} />}
          title={t('overview.empty.goals')}
          className="py-8"
        />
      ) : (
        <div className="space-y-2">
          {goals.map((goal) => {
            const progress = goal.progressPct ?? 0;
            const behind = resolveHealth(goal.status, progress) === 'behind';
            return (
              <Card
                key={goal.id}
                className={cn(
                  'rounded-xl border-border/25 bg-card/40',
                  behind && 'border-warning/25',
                )}
                data-testid={`overview-goal-${goal.id}`}
              >
                <CardContent className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/goals/${goal.id}`}
                      className="text-sm font-medium hover:text-primary transition-colors line-clamp-1"
                    >
                      {goal.title}
                    </Link>
                    <GoalStatusBadge status={goal.status} progressPct={progress} />
                  </div>
                  <GoalProgressBar
                    value={progress}
                    variant={
                      goal.status === 'completed'
                        ? 'completed'
                        : behind
                          ? 'behind'
                          : 'default'
                    }
                  />
                  <p className="text-[10px] text-caption-accessible">
                    {formatDate(new Date(goal.deadline))}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
