import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';
import AgentExplainabilitySheet from '@/components/explainability/AgentExplainabilitySheet';
import { SectionLabel } from '@/components/command-center/primitives';
import { ProactiveSuggestionCard } from '@/components/intelligence';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
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
            <ProactiveSuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              layout="list"
              highlighted={highlightedId === suggestion.id}
              executing={executingId === suggestion.id}
              streaming={streaming}
              showExplain={showExplain}
              showAutoExecute={settings.proactivePrefs.allowAutoExecute}
              onExecute={() => onExecute(suggestion.id)}
              onExplain={() => setExplainTarget(suggestion)}
              onDismiss={() => onDismiss(suggestion.id)}
              onSnooze={() => onSnooze(suggestion.id)}
              onAutoExecute={() => onExecute(suggestion.id)}
            />
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
