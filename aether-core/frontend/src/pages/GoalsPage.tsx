import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Card, CardContent, EmptyState, ModuleListPageSkeleton } from '@/components/ui';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import GoalCard from '@/components/goals/GoalCard';
import GoalFormDialog from '@/components/goals/GoalFormDialog';
import GoalSummaryStrip from '@/components/goals/GoalSummaryStrip';
import { ProactiveActionBar } from '@/components/intelligence';
import { useGoalMutations, useGoals } from '@/hooks/useGoals';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import { getDataAdapter } from '@/lib/data';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { t } from '@/lib/i18n';
import type { MerchantGoal } from '@/types/goals';

export default function GoalsPage() {
  const { settings } = useMerchantSettings();
  const queryClient = useQueryClient();
  const { data: goals = [], isLoading, error, refetch } = useGoals(true);
  const { create, update, remove, refresh } = useGoalMutations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MerchantGoal | null>(null);

  const { data: aiSuggestions = [] } = useQuery({
    queryKey: ['goals', 'ai-suggestions'],
    queryFn: async () => {
      const res = await getDataAdapter().fetchAiGoalSuggestions();
      return res.suggestions;
    },
    enabled: settings.goalPrefs.enabled,
  });

  const { data: conflictData } = useQuery({
    queryKey: ['goals', 'conflicts'],
    queryFn: () => getDataAdapter().fetchGoalConflicts(),
    enabled: settings.goalPrefs.enabled,
  });

  const activeGoals = goals.filter((g) => g.status === 'active' || g.status === 'paused');

  const acceptSuggestion = async (id: string) => {
    await getDataAdapter().acceptAiGoalSuggestion(id);
    await queryClient.invalidateQueries({ queryKey: ['goals'] });
  };

  const dismissSuggestion = async (id: string) => {
    await getDataAdapter().dismissAiGoalSuggestion(id);
    await queryClient.invalidateQueries({ queryKey: ['goals', 'ai-suggestions'] });
  };

  return (
    <ModulePageLayout
      title={t('goals.page.title')}
      subtitle={t('goals.page.subtitle')}
      featureKey="admin-command-bar"
      testId="goals-page"
      loading={isLoading}
      error={error ? String(error) : null}
      onRetry={() => void refetch()}
      skeleton={<ModuleListPageSkeleton />}
      headerExtra={
        settings.goalPrefs.enabled ? (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                void getDataAdapter()
                  .buildGoalPlan()
                  .then(() => refetch())
              }
            >
              {t('goals.page.runPlan')}
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus size={16} className="mr-2" />
              {t('goals.page.new')}
            </Button>
          </div>
        ) : null
      }
    >
      {!settings.goalPrefs.enabled ? (
        <EmptyState
          variant="premium"
          title={t('goals.page.disabledTitle')}
          description={t('goals.page.disabledHint')}
        />
      ) : (
        <div className="space-y-6 motion-safe:animate-fade-in">
          {conflictData?.conflicts?.length ? (
            <Card className="rounded-2xl border-warning/40 bg-warning/5">
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-semibold">{t('goals.conflicts.title')}</p>
                {conflictData.conflicts.slice(0, 3).map((c, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    {c.message}
                  </p>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {aiSuggestions.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold">{t('goals.suggestions.title')}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {aiSuggestions.map((s) => (
                  <Card key={s.id} className="rounded-2xl border-border/30">
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <p className="font-medium">{s.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{s.rationale}</p>
                      </div>
                      <ProactiveActionBar
                        suggestionId={s.id}
                        title={s.title}
                        variant="accept"
                        showExplain={false}
                        showSnooze={false}
                        onExecute={() => void acceptSuggestion(s.id)}
                        onDismiss={() => void dismissSuggestion(s.id)}
                        onSnooze={() => {}}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          {activeGoals.length === 0 ? (
            <EmptyState
              variant="premium"
              title={t('goals.page.emptyTitle')}
              description={t('goals.page.emptyHint')}
              action={<Button onClick={() => setDialogOpen(true)}>{t('goals.page.new')}</Button>}
            />
          ) : (
            <>
              <GoalSummaryStrip goals={activeGoals} />
              <div className="grid gap-4 md:grid-cols-2">
                {activeGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={(g) => {
                      setEditing(g);
                      setDialogOpen(true);
                    }}
                    onPause={(g) =>
                      void update.mutateAsync({ id: g.id, payload: { status: 'paused' } })
                    }
                    onResume={(g) =>
                      void update.mutateAsync({ id: g.id, payload: { status: 'active' } })
                    }
                    onDelete={(g) => void remove.mutateAsync(g.id)}
                    onRefresh={(g) => void refresh.mutateAsync(g.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <GoalFormDialog
        open={dialogOpen}
        initial={editing}
        parentGoals={goals.filter((g) => !g.parentGoalId && g.status === 'active')}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onSubmit={async (payload) => {
          if (editing) {
            await update.mutateAsync({
              id: editing.id,
              payload: {
                title: payload.title,
                description: payload.description ?? null,
                targetValue: payload.targetValue,
                deadline: payload.deadline,
                pursuitMode: payload.pursuitMode,
              },
            });
          } else {
            await create.mutateAsync(payload);
          }
        }}
      />
    </ModulePageLayout>
  );
}
