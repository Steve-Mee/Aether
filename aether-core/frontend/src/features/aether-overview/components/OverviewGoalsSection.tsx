import { Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import { Button, Card, CardContent, EmptyState } from '@/components/ui';
import GoalProgressBar from '@/components/goals/GoalProgressBar';
import { SectionLabel } from '@/components/command-center/primitives';
import { formatDate, t } from '@/lib/i18n';
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
          {goals.map((goal) => (
            <Card
              key={goal.id}
              className="rounded-xl border-border/25 bg-card/40"
              data-testid={`overview-goal-${goal.id}`}
            >
              <CardContent className="p-3.5 space-y-2">
                <Link
                  to={`/goals/${goal.id}`}
                  className="text-sm font-medium hover:text-primary transition-colors line-clamp-1"
                >
                  {goal.title}
                </Link>
                <GoalProgressBar value={goal.progressPct ?? 0} />
                <p className="text-[10px] text-caption-accessible">
                  {formatDate(new Date(goal.deadline))}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
