import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, ModuleListPageSkeleton } from '@/components/ui';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import GoalProgressBar from '@/components/goals/GoalProgressBar';
import GoalCard from '@/components/goals/GoalCard';
import { goalsRepository } from '@/lib/data';
import { t } from '@/lib/i18n';

export default function GoalDetailPage() {
  const { id = '' } = useParams();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['goals', id],
    queryFn: () => goalsRepository.get(id),
    enabled: Boolean(id),
  });

  const goal = data?.goal;
  const snapshots = data?.snapshots ?? [];
  const children = data?.children ?? [];

  return (
    <ModulePageLayout
      title={goal?.title ?? t('goals.detail.title')}
      subtitle={t('goals.detail.subtitle')}
      featureKey="admin-command-bar"
      testId="goal-detail-page"
      loading={isLoading}
      error={error ? String(error) : null}
      onRetry={() => void refetch()}
      skeleton={<ModuleListPageSkeleton />}
      headerExtra={
        <Link to="/goals">
          <Button variant="ghost">{t('goals.detail.back')}</Button>
        </Link>
      }
    >
      {goal ? (
        <div className="space-y-6 max-w-3xl">
          <Card className="rounded-2xl border-border/30">
            <CardContent className="p-5 space-y-4">
              <GoalProgressBar value={goal.progressPct ?? 0} />
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>{t('goals.card.target')}: {goal.targetValue}{goal.unit === 'percent' ? '%' : ''}</span>
                <span className="capitalize">{t(`goals.status.${goal.status}`)}</span>
              </div>
              {goal.outcomeRecordId ? (
                <p className="text-sm text-success">{t('goals.card.outcomeVerified')}</p>
              ) : null}
            </CardContent>
          </Card>

          {snapshots.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold">{t('goals.detail.snapshots')}</h2>
              <div className="space-y-2">
                {snapshots.slice(0, 10).map((s) => (
                  <div key={s.id} className="flex justify-between text-sm text-muted-foreground">
                    <span>{new Date(s.recordedAt).toLocaleDateString()}</span>
                    <span>{Math.round(s.progressPct)}%</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {children.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">{t('goals.detail.subgoals')}</h2>
              {children.map((child) => (
                <GoalCard key={child.id} goal={child} />
              ))}
            </section>
          ) : null}
        </div>
      ) : null}
    </ModulePageLayout>
  );
}
