import React from 'react';
import { Loader2 } from 'lucide-react';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { DemoSuggestion } from '@/lib/localIntentMatcher';
import { SuggestionButton } from '@/components/command-center/primitives';

interface SuggestionGroup {
  category: string;
  label: string;
  items: DemoSuggestion[];
}

interface CommandSuggestionsListProps {
  isActive: boolean;
  nowRelevant: DemoSuggestion[];
  suggestionGroups: SuggestionGroup[] | null;
  suggestions: DemoSuggestion[];
  keyboardIndex: number;
  activeSuggestionId: string | null;
  onSuggestionClick: (suggestion: DemoSuggestion) => void;
  suggestionsIdPrefix?: string;
  suggestionsLoading?: boolean;
}

export default function CommandSuggestionsList({
  isActive,
  nowRelevant,
  suggestionGroups,
  suggestions,
  keyboardIndex,
  activeSuggestionId,
  onSuggestionClick,
  suggestionsIdPrefix = 'suggestion',
  suggestionsLoading = false,
}: CommandSuggestionsListProps) {
  const renderSuggestion = (s: DemoSuggestion, index: number, compact?: boolean) => (
    <SuggestionButton
      key={s.id}
      id={`${suggestionsIdPrefix}-${s.id}`}
      suggestionId={s.id}
      label={s.label}
      description={s.badge ? `${s.badge}${s.hint ? ` · ${s.hint}` : ''}` : s.hint}
      executionMode={s.executionMode}
      active={activeSuggestionId === s.id || keyboardIndex === index}
      selected={keyboardIndex === index || activeSuggestionId === s.id}
      onClick={() => onSuggestionClick(s)}
      className={compact ? 'shrink-0 whitespace-nowrap text-xs py-2 px-3 min-w-[10rem]' : undefined}
    />
  );

  return (
    <>
      <p
        className={cn(
          'text-[10px] uppercase tracking-widest text-caption-accessible mb-2.5 px-0.5 flex items-center gap-1.5',
          !isActive && 'sr-only',
        )}
      >
        {t('commandCenter.suggestions.label')}
        {suggestionsLoading && isActive && (
          <Loader2
            size={12}
            className="animate-spin text-muted-foreground"
            aria-hidden
            data-testid="command-suggestions-loading"
          />
        )}
      </p>
      {isActive && nowRelevant.length > 0 && (
        <div className="mb-4" data-testid="command-suggestions-now-relevant">
          <p className="text-[10px] uppercase tracking-widest text-primary-readable mb-2 px-0.5">
            {t('commandCenter.suggestions.nowRelevant')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {nowRelevant.map((s, i) => renderSuggestion(s, i))}
          </div>
        </div>
      )}
      {isActive && suggestionGroups && suggestionGroups.length > 0 ? (
        <div className="space-y-4">
          {(() => {
            let globalIndex = nowRelevant.length;
            return suggestionGroups.map((group) => (
              <div key={group.category}>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 px-0.5">
                  {t(`commandCenter.suggestion.category.${group.category}`)}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.items.map((s) => {
                    const index = globalIndex++;
                    return renderSuggestion(s, index);
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      ) : (
        <div className="flex gap-2 min-w-min sm:min-w-0 sm:flex-wrap">
          {suggestions.map((s, index) => renderSuggestion(s, index, true))}
        </div>
      )}
    </>
  );
}
