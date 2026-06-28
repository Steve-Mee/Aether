import { Link } from 'react-router-dom';
import { Button, Card, CardContent, Skeleton } from '@/components/ui';
import { useGoals } from '@/hooks/useGoals';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import GoalProgressBar from './GoalProgressBar';
import { GoalStatusBadge, resolveHealth } from '@/components/intelligence';
import { SectionLabel } from '@/components/command-center/primitives';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';

export default function GoalsHomeWidget() {
  const { settings } = useMerchantSettings();
  const { data: goals = [], isLoading } = useGoals(false);

  if (!settings.goalPrefs?.enabled || !settings.goalPrefs?.showOnCommandCenter) return null;

  if (isLoading) {
    return (
      <section className="space-y-4" data-testid="goals-home-widget-loading">
        <SectionLabel title={t('goals.home.title')} />
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </section>
    );
  }

  const active = goals.filter((g) => g.status === 'active').slice(0, 3);
  if (active.length === 0) return null;

  return (
    <section className="space-y-4" data-testid="goals-home-widget">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel title={t('goals.home.title')} />
        <Button variant="ghost" size="sm" asChild>
          <Link to="/goals">{t('goals.home.viewAll')}</Link>
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {active.map((goal) => {
          const progress = goal.progressPct ?? 0;
          const behind = resolveHealth(goal.status, progress) === 'behind';
          const daysLeft = Math.max(
            0,
            Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86_400_000),
          );
          return (
            <Card
              key={goal.id}
              className={cn('rounded-xl border-border/30', behind && 'border-warning/30')}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium truncate">{goal.title}</p>
                  <GoalStatusBadge status={goal.status} progressPct={progress} />
                </div>
                <GoalProgressBar
                  value={progress}
                  variant={behind ? 'behind' : 'default'}
                />
                <p className="text-[10px] text-muted-foreground">{daysLeft}d</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
