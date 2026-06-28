import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button, Card, CardContent, EmptyState } from '@/components/ui';
import AgentExplainabilitySheet from '@/components/explainability/AgentExplainabilitySheet';
import { AutonomyModeBadge, SectionLabel, StatChip } from '@/components/command-center/primitives';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import type { ProactiveSuggestion } from '@/lib/proactiveSuggestionsDemo';

interface OverviewProactiveSectionProps {
  items: ProactiveSuggestion[];
  onExecute: (id: string) => void;
  onDismiss: (id: string) => void;
  onSnooze: (id: string) => void;
  executingId: string | null;
  streaming: boolean;
  highlightedId?: string | null;
}

export default function OverviewProactiveSection({
  items,
  onExecute,
  onDismiss,
  onSnooze,
  executingId,
  streaming,
  highlightedId,
}: OverviewProactiveSectionProps) {
  const { settings } = useMerchantSettings();
  const [explainTarget, setExplainTarget] = useState<ProactiveSuggestion | null>(null);
  const showExplain = settings.explainabilityPrefs.detailLevel !== 'off';

  return (
    <section data-testid="overview-proactive-section">
      <div className="flex items-center justify-between gap-3 mb-4">
        <SectionLabel title={t('overview.section.proactive')} />
        <Button variant="ghost" size="sm" asChild>
          <Link to="/command-center">{t('overview.section.proactive.viewAll')}</Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          variant="premium"
          icon={<Sparkles size={24} strokeWidth={1.5} />}
          title={t('overview.empty.proactive')}
          className="py-8"
        />
      ) : (
        <div className="space-y-2">
          {items.map((suggestion) => (
            <Card
              key={suggestion.id}
              data-testid={`overview-proactive-${suggestion.id}`}
              className={cn(
                'rounded-xl border-border/25 bg-card/40',
                executingId === suggestion.id && streaming && 'ring-1 ring-primary/30',
                highlightedId === suggestion.id && 'ring-2 ring-primary/40',
              )}
            >
              <CardContent className="p-3.5 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <AutonomyModeBadge mode={suggestion.executionMode} />
                  {suggestion.impactHint && (
                    <StatChip className="text-caption-accessible">{suggestion.impactHint}</StatChip>
                  )}
                </div>
                <p className="text-sm font-medium leading-snug">{suggestion.title}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onExecute(suggestion.id)}
                  >
                    {t('commandCenter.proactive.run')}
                  </Button>
                  {showExplain && suggestion.hasExplainability !== false && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setExplainTarget(suggestion)}
                    >
                      {t('explain.why')}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => onDismiss(suggestion.id)}
                  >
                    {t('goals.suggestions.dismiss')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => onSnooze(suggestion.id)}
                  >
                    {t('command.suggestions.snooze')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {explainTarget && (
        <AgentExplainabilitySheet
          open={Boolean(explainTarget)}
          onClose={() => setExplainTarget(null)}
          entityType="proactive_suggestion"
          entityId={explainTarget.id}
        />
      )}
    </section>
  );
}
