import { useCallback, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import React from 'react';
import { Badge, EmptyState } from '@/components/ui';
import { useCommand } from '@/lib/CommandContext';
import { env } from '@/lib/config/env';
import type { DemoIntentId } from '@/lib/localIntentMatcher';
import type { ProactiveSuggestion } from '@/lib/proactiveSuggestionsDemo';
import { useProactiveSuggestions } from '@/hooks/useProactiveSuggestions';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import { t } from '@/lib/i18n';
import { SectionLabel } from '@/components/command-center/primitives';
import { ProactiveSuggestionCard } from '@/components/intelligence';
import LiveExplainPanel from '@/components/explainability/LiveExplainPanel';
import AgentExplainabilitySheet from '@/components/explainability/AgentExplainabilitySheet';

interface ProactiveSuggestionsSectionProps {
  onSelect: (
    command: string,
    intentId: DemoIntentId,
    autoExecute?: boolean,
  ) => void | Promise<void>;
}

export default function ProactiveSuggestionsSection({
  onSelect,
}: ProactiveSuggestionsSectionProps) {
  const { openPalette } = useCommand();
  const { settings } = useMerchantSettings();
  const { suggestions, dismiss, snooze, execute, executingId, streaming, liveExplain } =
    useProactiveSuggestions();
  const [explainTarget, setExplainTarget] = useState<ProactiveSuggestion | null>(null);
  const showExplain = settings.explainabilityPrefs.detailLevel !== 'off';

  const handleSelect = useCallback(
    (suggestion: ProactiveSuggestion) => {
      if (env.isLiveMode) {
        execute(suggestion.id);
        return;
      }
      dismiss(suggestion.id);
      void onSelect(suggestion.command, suggestion.intentId);
    },
    [dismiss, execute, onSelect],
  );

  const handleAutoExecute = useCallback(
    (suggestion: ProactiveSuggestion) => {
      if (env.isLiveMode) {
        execute(suggestion.id);
        return;
      }
      dismiss(suggestion.id);
      void onSelect(suggestion.command, suggestion.intentId, true);
    },
    [dismiss, execute, onSelect],
  );

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, ProactiveSuggestion[]> = {};
    suggestions.forEach((s) => {
      const key = s.category || 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return groups;
  }, [suggestions]);

  const categoryLabels: Record<string, string> = {
    prijs: 'Prijsoptimalisatie',
    leverancier: 'Leveranciers',
    orders: 'Orders',
    marge: 'Marge',
    other: 'Algemeen',
  };

  return (
    <section className="mb-8 w-full" aria-labelledby="proactive-suggestions-heading">
      <SectionLabel
        id="proactive-suggestions-heading"
        title={t('commandCenter.section.proactive.title')}
        subtitle={t('commandCenter.section.proactive.subtitle')}
      />

      {streaming &&
        settings.explainabilityPrefs.showLiveExplain !== false &&
        settings.explainabilityPrefs.detailLevel !== 'off' && (
          <div className="mb-4">
            <LiveExplainPanel live={liveExplain} handoffChainLength={0} />
          </div>
        )}
      {suggestions.length === 0 ? (
        <EmptyState
          variant="premium"
          data-testid="proactive-suggestions-empty"
          icon={<Sparkles size={28} strokeWidth={1.5} />}
          title={t('commandCenter.empty.proactive.title')}
          description={t('commandCenter.empty.proactive.description')}
          actionLabel={t('commandCenter.empty.proactive.action')}
          onAction={openPalette}
          className="py-10"
        />
      ) : (
        <div className="space-y-6" data-testid="proactive-suggestions-list">
          {Object.entries(groupedByCategory).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground/80">
                  {categoryLabels[category] || category}
                </h3>
                <Badge variant="muted" className="text-xs">
                  {items.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {items.map((suggestion) => (
                  <ProactiveSuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    layout="grid"
                    executing={executingId === suggestion.id}
                    streaming={streaming}
                    showExplain={showExplain}
                    showAutoExecute={settings.proactivePrefs.allowAutoExecute}
                    onExecute={() => handleSelect(suggestion)}
                    onExplain={() => setExplainTarget(suggestion)}
                    onDismiss={() => dismiss(suggestion.id)}
                    onSnooze={() => snooze(suggestion.id)}
                    onAutoExecute={() => handleAutoExecute(suggestion)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {explainTarget && (
        <AgentExplainabilitySheet
          entityType="proactive_suggestion"
          entityId={explainTarget.id}
          title={explainTarget.title}
          open={Boolean(explainTarget)}
          onClose={() => setExplainTarget(null)}
        />
      )}
    </section>
  );
}
