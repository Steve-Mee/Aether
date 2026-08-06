import React from 'react';
import { Package, PieChart, Sparkles, TrendingUp, Truck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';
import { AutonomyModeBadge, IconBadge, StatChip } from '@/components/command-center/primitives';
import type { ActionExecutionMode } from '@/lib/actionAutonomy';
import type { ProactiveCategory } from '@/lib/proactiveSuggestionsDemo';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import ProactiveActionBar from './ProactiveActionBar';

const categoryIcons: Record<ProactiveCategory, React.ReactNode> = {
  prijs: <TrendingUp size={16} strokeWidth={1.75} />,
  leverancier: <Truck size={16} strokeWidth={1.75} />,
  orders: <Package size={16} strokeWidth={1.75} />,
  marge: <PieChart size={16} strokeWidth={1.75} />,
};

export interface ProactiveSuggestionCardData {
  id: string;
  title: string;
  impactHint?: string;
  category: ProactiveCategory | string;
  executionMode: ActionExecutionMode;
  hasExplainability?: boolean;
  priority?: number;
  confidence?: number;
  agentKey?: string;
  goalId?: string;
}

interface ProactiveSuggestionCardProps {
  suggestion: ProactiveSuggestionCardData;
  layout?: 'grid' | 'list';
  highlighted?: boolean;
  executing?: boolean;
  streaming?: boolean;
  showExplain?: boolean;
  showAutoExecute?: boolean;
  showCategoryIcon?: boolean;
  showAetherLabel?: boolean;
  onExecute: () => void;
  onExplain?: () => void;
  onDismiss: () => void;
  onSnooze: () => void;
  onAutoExecute?: () => void;
  className?: string;
}

function categoryIcon(category: string): React.ReactNode {
  if (category in categoryIcons) {
    return categoryIcons[category as ProactiveCategory];
  }
  return <Sparkles size={16} strokeWidth={1.75} />;
}

export default function ProactiveSuggestionCard({
  suggestion,
  layout = 'grid',
  highlighted = false,
  executing = false,
  streaming = false,
  showExplain = true,
  showAutoExecute = false,
  showCategoryIcon = true,
  showAetherLabel = true,
  onExecute,
  onExplain,
  onDismiss,
  onSnooze,
  onAutoExecute,
  className,
}: ProactiveSuggestionCardProps) {
  const isList = layout === 'list';

  return (
    <Card
      data-testid={`proactive-suggestion-${suggestion.id}`}
      className={cn(
        'group rounded-2xl border-border/25 bg-card/40 backdrop-blur-sm insight-card-shadow transition-colors duration-fast',
        isList && 'rounded-xl',
        executing && streaming && 'ring-1 ring-primary/30',
        highlighted && 'ring-2 ring-primary/40',
        className,
      )}
    >
      <CardContent className={cn(isList ? 'p-3.5' : 'p-4 sm:p-5')}>
        <div className={cn('flex items-start gap-3', isList && 'gap-2.5')}>
          {showCategoryIcon && (
            <IconBadge className="mt-0.5 bg-primary/5 text-primary-readable shrink-0">
              {categoryIcon(suggestion.category)}
            </IconBadge>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {showAetherLabel && (
                <p className="text-[10px] font-medium uppercase tracking-widest text-caption-accessible flex items-center gap-1.5">
                  <Sparkles size={11} aria-hidden />
                  AETHER
                </p>
              )}
              <AutonomyModeBadge mode={suggestion.executionMode} />
            </div>
            <p
              className={cn(
                'font-medium leading-snug text-foreground/95',
                isList ? 'text-sm' : 'text-sm',
              )}
            >
              {suggestion.title}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {suggestion.impactHint && (
                <StatChip className="text-caption-accessible">{suggestion.impactHint}</StatChip>
              )}
              {suggestion.priority != null && suggestion.priority >= 7 && (
                <StatChip className="text-xs text-primary-readable bg-primary/10">
                  {t('proactive.priority.high')}
                </StatChip>
              )}
              {suggestion.confidence != null && (
                <StatChip
                  className={cn(
                    'text-xs',
                    suggestion.confidence >= 0.8
                      ? 'text-success bg-success/10'
                      : suggestion.confidence >= 0.5
                        ? 'text-warning bg-warning/10'
                        : 'text-muted-foreground bg-muted/20',
                  )}
                >
                  {Math.round(suggestion.confidence * 100)}% {t('proactive.confidence')}
                </StatChip>
              )}
              {suggestion.agentKey && (
                <StatChip className="text-xs text-muted-foreground">
                  {suggestion.agentKey}
                </StatChip>
              )}
            </div>
            <ProactiveActionBar
              suggestionId={suggestion.id}
              title={suggestion.title}
              executionMode={suggestion.executionMode}
              showExplain={showExplain && suggestion.hasExplainability !== false}
              showAutoExecute={showAutoExecute}
              executing={executing}
              streaming={streaming}
              onExecute={onExecute}
              onExplain={onExplain}
              onDismiss={onDismiss}
              onSnooze={onSnooze}
              onAutoExecute={onAutoExecute}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
