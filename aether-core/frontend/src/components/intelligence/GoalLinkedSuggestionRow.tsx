import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';
import type { ApiProactiveSuggestion } from '@/types/suggestions';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';

interface GoalLinkedSuggestionRowProps {
  suggestion: ApiProactiveSuggestion;
  onExecute?: (id: string) => void;
  onDismiss?: (id: string) => void;
  className?: string;
}

export default function GoalLinkedSuggestionRow({
  suggestion,
  onExecute,
  onDismiss,
  className,
}: GoalLinkedSuggestionRowProps) {
  const canAct = Boolean(onExecute || onDismiss);

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border/25 bg-muted/5 px-3 py-2',
        className,
      )}
      data-testid={`goal-linked-suggestion-${suggestion.id}`}
    >
      <Sparkles size={12} className="text-primary shrink-0" aria-hidden />
      <p className="text-xs text-foreground/90 truncate flex-1 min-w-0">{suggestion.label}</p>
      {canAct ? (
        <div className="flex shrink-0 items-center gap-1">
          {onExecute && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px]"
              onClick={() => onExecute(suggestion.id)}
            >
              {t('commandCenter.proactive.run')}
            </Button>
          )}
          {onDismiss && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] text-muted-foreground"
              onClick={() => onDismiss(suggestion.id)}
            >
              {t('proactive.action.dismiss')}
            </Button>
          )}
        </div>
      ) : (
        <Link
          to={`/command-center?highlight=${suggestion.id}`}
          className="text-[10px] text-primary hover:underline shrink-0"
        >
          {t('explain.why')}
        </Link>
      )}
    </div>
  );
}
