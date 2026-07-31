import type { TodayReadyInsight, TodayReadyInsightId } from './types';

export function visibleInsights(insights: TodayReadyInsight[]): TodayReadyInsight[] {
  return insights.filter((i) => i.visible && !i.exiting).sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Includes exiting cards so exit animation can play before removal */
export function renderableInsights(insights: TodayReadyInsight[]): TodayReadyInsight[] {
  return insights.filter((i) => i.visible).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function visibleInsightIds(insights: TodayReadyInsight[]): TodayReadyInsightId[] {
  return visibleInsights(insights).map((i) => i.id);
}

export function subtitleForInsights(insights: TodayReadyInsight[]): string {
  const count = renderableInsights(insights).length;

  if (count === 0) {
    return 'Alles afgehandeld voor vandaag.';
  }
  if (count === 1) {
    return 'Eén actie klaar — bevestig of laat AETHER uitvoeren.';
  }
  return `${count} acties klaar — bevestig of laat AETHER uitvoeren.`;
}
