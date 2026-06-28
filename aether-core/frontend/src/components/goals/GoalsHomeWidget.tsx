import { Link } from 'react-router-dom';
import { Button, Card, CardContent } from '@/components/ui';
import { useGoals } from '@/hooks/useGoals';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import GoalProgressBar from './GoalProgressBar';
import { SectionLabel } from '@/components/command-center/primitives';
import { t } from '@/lib/i18n';

export default function GoalsHomeWidget() {
  const { settings } = useMerchantSettings();
  const { data: goals = [], isLoading } = useGoals(false);

  if (!settings.goalPrefs.enabled || !settings.goalPrefs.showOnCommandCenter) return null;
  if (isLoading) return null;

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
        {active.map((goal) => (
          <Card key={goal.id} className="rounded-xl border-border/30">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-medium truncate">{goal.title}</p>
              <GoalProgressBar value={goal.progressPct ?? 0} />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
