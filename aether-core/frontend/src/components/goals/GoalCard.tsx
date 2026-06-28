import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play, RefreshCw, Trash2 } from 'lucide-react';
import { Button, Card, CardContent } from '@/components/ui';
import type { MerchantGoal } from '@/types/goals';
import type { ApiProactiveSuggestion } from '@/types/suggestions';
import GoalProgressBar from './GoalProgressBar';
import { GoalLinkedSuggestionRow, GoalStatusBadge } from '@/components/intelligence';
import { useProactiveSuggestions } from '@/hooks/useProactiveSuggestions';
import { getDataAdapter } from '@/lib/data';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface GoalCardProps {
  goal: MerchantGoal;
  depth?: number;
  onEdit?: (goal: MerchantGoal) => void;
  onPause?: (goal: MerchantGoal) => void;
  onResume?: (goal: MerchantGoal) => void;
  onDelete?: (goal: MerchantGoal) => void;
  onRefresh?: (goal: MerchantGoal) => void;
}

const metricLabels: Record<string, string> = {
  margin: 'goals.metric.margin',
  revenue: 'goals.metric.revenue',
  inventory: 'goals.metric.inventory',
  category_revenue: 'goals.metric.category',
};

export default function GoalCard({
  goal,
  depth = 0,
  onEdit,
  onPause,
  onResume,
  onDelete,
  onRefresh,
}: GoalCardProps) {
  const [linkedSuggestions, setLinkedSuggestions] = useState<ApiProactiveSuggestion[]>([]);
  const { execute, dismiss } = useProactiveSuggestions();

  useEffect(() => {
    if (goal.status !== 'active' && goal.status !== 'paused') return;
    void getDataAdapter()
      .fetchGoalLinkedSuggestions(goal.id)
      .then((res) => setLinkedSuggestions(res.suggestions.slice(0, 2)))
      .catch(() => setLinkedSuggestions([]));
  }, [goal.id, goal.status]);

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86_400_000),
  );
  const progress = goal.progressPct ?? 0;
  const behind = progress < 50 && goal.status === 'active';

  return (
    <div className={cn(depth > 0 && 'ml-4 border-l-2 border-border/30 pl-4')}>
      <Card className={cn('rounded-2xl border-border/30', behind && 'border-warning/30')}>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t(metricLabels[goal.metricType] ?? 'goals.metric.generic')}
              </p>
              <h3 className="text-base font-semibold mt-1">
                <Link to={`/goals/${goal.id}`} className="hover:underline">
                  {goal.title}
                </Link>
              </h3>
              {goal.description ? (
                <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-1">
              <GoalStatusBadge status={goal.status} progressPct={progress} />
              <span className="text-xs rounded-full px-2 py-1 bg-muted/50 capitalize">
                {t(`goals.pursuit.${goal.pursuitMode}`)}
              </span>
              {goal.status === 'completed' && goal.outcomeRecordId ? (
                <span className="text-xs rounded-full px-2 py-1 bg-success/15 text-success">
                  {t('goals.card.outcomeVerified')}
                  {goal.verifiedUplift != null ? ` (+${goal.verifiedUplift.toFixed(1)})` : ''}
                </span>
              ) : null}
            </div>
          </div>

          <GoalProgressBar
            value={progress}
            variant={
              goal.status === 'completed' ? 'completed' : behind ? 'behind' : 'default'
            }
            showMilestones
          />

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>
              {t('goals.card.target')}: {goal.targetValue}
              {goal.unit === 'percent' ? '%' : ''}
            </span>
            <span>
              {t('goals.card.deadline')}: {daysLeft}d
            </span>
          </div>

          {linkedSuggestions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t('goals.card.linkedSuggestions')}
              </p>
              {linkedSuggestions.map((s) => (
                <GoalLinkedSuggestionRow
                  key={s.id}
                  suggestion={s}
                  onExecute={(id) => execute(id)}
                  onDismiss={(id) => dismiss(id)}
                />
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {onEdit ? (
              <Button size="sm" variant="secondary" onClick={() => onEdit(goal)}>
                {t('goals.action.edit')}
              </Button>
            ) : null}
            {goal.status === 'active' && onPause ? (
              <Button size="sm" variant="ghost" onClick={() => onPause(goal)}>
                <Pause size={14} className="mr-1" />
                {t('goals.action.pause')}
              </Button>
            ) : null}
            {goal.status === 'paused' && onResume ? (
              <Button size="sm" variant="ghost" onClick={() => onResume(goal)}>
                <Play size={14} className="mr-1" />
                {t('goals.action.resume')}
              </Button>
            ) : null}
            {onRefresh ? (
              <Button size="sm" variant="ghost" onClick={() => onRefresh(goal)}>
                <RefreshCw size={14} className="mr-1" />
                {t('goals.action.refresh')}
              </Button>
            ) : null}
            {onDelete ? (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(goal)}>
                <Trash2 size={14} className="mr-1" />
                {t('goals.action.delete')}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {goal.children?.map((child) => (
        <div key={child.id} className="mt-3">
          <GoalCard goal={child} depth={depth + 1} onRefresh={onRefresh} />
        </div>
      ))}
    </div>
  );
}
