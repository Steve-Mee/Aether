import React from 'react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import type { ActionExecutionMode } from '@/lib/actionAutonomy';
import StatusDot from './StatusDot';

export interface ProactiveActionBarProps {
  suggestionId: string;
  title: string;
  executionMode?: ActionExecutionMode;
  showExplain?: boolean;
  showAutoExecute?: boolean;
  executing?: boolean;
  streaming?: boolean;
  onExecute: () => void;
  onExplain?: () => void;
  onDismiss: () => void;
  onSnooze: () => void;
  onAutoExecute?: () => void;
  /** Use accept label instead of execute (for AI goal suggestions). */
  variant?: 'proactive' | 'accept';
  showSnooze?: boolean;
  className?: string;
}

export default function ProactiveActionBar({
  suggestionId,
  title,
  executionMode,
  showExplain = true,
  showAutoExecute = false,
  executing = false,
  streaming = false,
  onExecute,
  onExplain,
  onDismiss,
  onSnooze,
  onAutoExecute,
  variant = 'proactive',
  showSnooze = true,
  className,
}: ProactiveActionBarProps) {
  const primaryLabel =
    variant === 'accept' ? t('goals.suggestions.accept') : t('commandCenter.proactive.run');
  const dismissLabel =
    variant === 'accept' ? t('goals.suggestions.dismiss') : t('proactive.action.dismiss');

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5 pt-1', className)}>
      <Button
        type="button"
        size="sm"
        className={cn(
          'h-7 rounded-lg px-2.5 text-[11px]',
          executing && streaming && 'ring-1 ring-primary/30',
        )}
        onClick={(e) => {
          e.stopPropagation();
          onExecute();
        }}
        disabled={executing && streaming}
        data-testid={`proactive-execute-${suggestionId}`}
        aria-label={`${primaryLabel}: ${title}`}
      >
        {executing && streaming ? (
          <span className="inline-flex items-center gap-1.5">
            <StatusDot variant="executing" />
            {primaryLabel}
          </span>
        ) : (
          primaryLabel
        )}
      </Button>
      {showExplain && onExplain && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 rounded-lg px-2 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onExplain();
          }}
          aria-label={`${t('explain.why')} ${title}`}
        >
          {t('explain.why')}
        </Button>
      )}
      {showAutoExecute && executionMode === 'autonomous' && onAutoExecute && (
        <Button
          type="button"
          size="sm"
          className="h-7 rounded-lg px-2.5 text-[11px]"
          onClick={(e) => {
            e.stopPropagation();
            onAutoExecute();
          }}
          aria-label={`${t('proactive.action.autoExecute')}: ${title}`}
        >
          {t('proactive.action.autoExecute')}
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 rounded-lg px-2 text-[11px] text-muted-foreground hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        aria-label={`${dismissLabel}: ${title}`}
      >
        {dismissLabel}
      </Button>
      {showSnooze && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 rounded-lg px-2 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onSnooze();
          }}
          title={t('command.suggestions.snoozeTomorrow')}
          aria-label={`${t('command.suggestions.snooze')}: ${title}`}
        >
          {t('command.suggestions.snooze')}
        </Button>
      )}
    </div>
  );
}
