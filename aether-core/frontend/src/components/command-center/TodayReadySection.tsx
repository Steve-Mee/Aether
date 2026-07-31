import { useCallback, useEffect, useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';
import React from 'react';
import { EmptyState } from '@/components/ui';
import { t } from '@/lib/i18n';
import { SectionLabel } from './primitives';
import type { LinkedInsightId } from '@/lib/localIntentMatcher';
import type { TodayReadyInsight, TodayReadyInsightId } from '@/lib/todayReady';
import {
  subtitleForInsights,
  renderableInsights,
  executionModeForTodayReadyInsight,
} from '@/lib/todayReady';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import TodayReadyInsightCard from '../insight-cards/TodayReadyInsightCard';

const UPDATE_PULSE_MS = 2000;

interface TodayReadySectionProps {
  insights: TodayReadyInsight[];
  highlightId?: LinkedInsightId;
  highlightGeneration?: number;
  highlightPulse?: boolean;
  onActivate?: (insightId: TodayReadyInsightId) => void;
  onExecute?: (insightId: TodayReadyInsightId) => void;
}

export default function TodayReadySection({
  insights,
  highlightId,
  highlightGeneration = 0,
  highlightPulse = false,
  onActivate,
  onExecute,
}: TodayReadySectionProps) {
  const { settings } = useMerchantSettings();
  const refMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const visible = renderableInsights(insights);
  const activeCount = visible.filter((i) => !i.exiting).length;

  const setRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      refMap.current.set(id, el);
    } else {
      refMap.current.delete(id);
    }
  }, []);

  useEffect(() => {
    if (!highlightId) return;

    const target = refMap.current.get(highlightId);
    if (target) {
      window.setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 300);
    }
  }, [highlightId, highlightGeneration]);

  const now = Date.now();

  return (
    <section
      className="space-y-5"
      aria-labelledby="today-ready-heading"
      data-testid="today-ready-section"
    >
      <SectionLabel
        id="today-ready-heading"
        title={t('commandCenter.section.todayReady.title')}
        subtitle={subtitleForInsights(insights)}
      />

      {activeCount === 0 && visible.length === 0 ? (
        <EmptyState
          variant="premium"
          data-testid="today-ready-empty"
          icon={<CheckCircle2 size={28} strokeWidth={1.5} />}
          title={t('commandCenter.empty.todayReady.title')}
          description={t('commandCenter.empty.todayReady.description')}
          hint={t('commandCenter.empty.todayReady.hint')}
          className="py-10"
        />
      ) : (
        <div className="grid w-full grid-cols-1 gap-4 transition-all duration-300 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {visible.map((insight) => {
            const recentlyUpdated =
              insight.updatedAt !== undefined && now - insight.updatedAt < UPDATE_PULSE_MS;

            return (
              <div
                key={insight.id}
                ref={(el) => setRef(insight.id, el)}
                data-highlighted={highlightId === insight.id ? insight.id : undefined}
                className="transition-all duration-300"
              >
                <TodayReadyInsightCard
                  insight={insight}
                  executionMode={executionModeForTodayReadyInsight(settings, insight.id)}
                  highlighted={highlightId === insight.id}
                  highlightPulse={highlightPulse && highlightId === insight.id}
                  recentlyUpdated={recentlyUpdated && highlightId !== insight.id}
                  onActivate={onActivate}
                  onExecute={onExecute}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
