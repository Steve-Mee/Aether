import { useCallback, useMemo, useState } from 'react';
import { Package, PieChart, Sparkles, TrendingUp, Truck } from 'lucide-react';
import React from 'react';
import { Button, Card, CardContent, EmptyState } from '@/components/ui';
import { useCommand } from '@/lib/CommandContext';
import type { DemoIntentId } from '@/lib/localIntentMatcher';
import {
  dismissSuggestion,
  getProactiveSuggestions,
  snoozeSuggestion,
  type ProactiveCategory,
  type ProactiveSuggestion,
} from '@/lib/proactiveSuggestionsDemo';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { AutonomyModeBadge, IconBadge, SectionLabel, StatChip } from './primitives';

const categoryIcons: Record<ProactiveCategory, React.ReactNode> = {
  prijs: <TrendingUp size={16} strokeWidth={1.75} />,
  leverancier: <Truck size={16} strokeWidth={1.75} />,
  orders: <Package size={16} strokeWidth={1.75} />,
  marge: <PieChart size={16} strokeWidth={1.75} />,
};

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
  const [version, setVersion] = useState(0);
  const suggestions = useMemo(() => getProactiveSuggestions(settings), [version, settings]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const handleSelect = (suggestion: ProactiveSuggestion) => {
    dismissSuggestion(suggestion.id);
    refresh();
    void onSelect(suggestion.command, suggestion.intentId);
  };

  const handleAutoExecute = (e: React.MouseEvent, suggestion: ProactiveSuggestion) => {
    e.stopPropagation();
    dismissSuggestion(suggestion.id);
    refresh();
    void onSelect(suggestion.command, suggestion.intentId, true);
  };

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    dismissSuggestion(id);
    refresh();
  };

  const handleSnooze = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    snoozeSuggestion(id);
    refresh();
  };

  return (
    <section className="mb-8 w-full" aria-labelledby="proactive-suggestions-heading">
      <SectionLabel
        id="proactive-suggestions-heading"
        title={t('commandCenter.section.proactive.title')}
        subtitle={t('commandCenter.section.proactive.subtitle')}
      />

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
        <div
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
          data-testid="proactive-suggestions-list"
        >
          {suggestions.map((suggestion) => (
            <Card
              key={suggestion.id}
              data-testid={`proactive-suggestion-${suggestion.id}`}
              className="group rounded-2xl border-border/25 bg-card/40 backdrop-blur-sm insight-card-shadow"
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <IconBadge className="mt-0.5 bg-primary/5 text-primary-readable">
                    {categoryIcons[suggestion.category]}
                  </IconBadge>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[10px] font-medium uppercase tracking-widest text-caption-accessible flex items-center gap-1.5">
                        <Sparkles size={11} aria-hidden />
                        AETHER
                      </p>
                      <AutonomyModeBadge mode={suggestion.executionMode} />
                    </div>
                    <p className="text-sm font-medium leading-snug text-foreground/95">
                      {suggestion.title}
                    </p>
                    {suggestion.impactHint && (
                      <StatChip className="text-caption-accessible">
                        {suggestion.impactHint}
                      </StatChip>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 rounded-lg px-2.5 text-[11px]"
                        onClick={() => handleSelect(suggestion)}
                      >
                        {t('commandCenter.proactive.run')}
                      </Button>
                      {suggestion.executionMode === 'autonomous' && (
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 rounded-lg px-2.5 text-[11px]"
                          onClick={(e) => handleAutoExecute(e, suggestion)}
                          aria-label={`Automatisch uitvoeren: ${suggestion.title}`}
                        >
                          Automatisch uitvoeren
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 rounded-lg px-2 text-[11px] text-muted-foreground hover:text-foreground"
                        onClick={(e) => handleDismiss(e, suggestion.id)}
                        aria-label={`Negeren: ${suggestion.title}`}
                      >
                        Negeren
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 rounded-lg px-2 text-[11px] text-muted-foreground hover:text-foreground"
                        onClick={(e) => handleSnooze(e, suggestion.id)}
                        title={t('command.suggestions.snoozeTomorrow')}
                        aria-label={`${t('command.suggestions.snooze')}: ${suggestion.title}`}
                      >
                        {t('command.suggestions.snooze')}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
