import type { DemoIntentId } from '../localIntentMatcher';
import { getInitialTodayReadyInsights, syncTimeLabel } from './initialInsights';
import type { TodayReadyInsight, TodayReadyInsightId } from './types';

export function bumpOthersSortOrder(
  insights: TodayReadyInsight[],
  excludeId: TodayReadyInsightId,
  frontOrder: number,
): TodayReadyInsight[] {
  return insights.map((insight) => {
    if (insight.id === excludeId) return insight;
    if (!insight.visible || insight.exiting) return insight;
    return { ...insight, sortOrder: insight.sortOrder + frontOrder + 1 };
  });
}

export function updateInsight(
  insights: TodayReadyInsight[],
  id: TodayReadyInsightId,
  patch: Partial<TodayReadyInsight>,
): TodayReadyInsight[] {
  return insights.map((insight) =>
    insight.id === id ? { ...insight, ...patch, updatedAt: Date.now() } : insight,
  );
}

export function promoteToFront(
  insights: TodayReadyInsight[],
  id: TodayReadyInsightId,
): TodayReadyInsight[] {
  const bumped = bumpOthersSortOrder(insights, id, 0);
  return updateInsight(bumped, id, { sortOrder: 0, executed: false, exiting: false });
}

export function demoteInsight(
  insights: TodayReadyInsight[],
  id: TodayReadyInsightId,
): TodayReadyInsight[] {
  const maxOrder = Math.max(
    ...insights.filter((i) => i.visible && i.id !== id && !i.exiting).map((i) => i.sortOrder),
    0,
  );
  return updateInsight(insights, id, {
    executed: true,
    sortOrder: maxOrder + 1,
    exiting: false,
  });
}

export function refreshVisibleSiblings(insights: TodayReadyInsight[]): TodayReadyInsight[] {
  const now = Date.now();
  return insights.map((insight) => {
    if (!insight.visible || insight.exiting) return insight;

    switch (insight.id) {
      case 'pricing':
        return {
          ...insight,
          updatedAt: now,
          metric: insight.metric
            ? { ...insight.metric, subValue: '· week actueel' }
            : insight.metric,
        };
      case 'supplier':
        return {
          ...insight,
          updatedAt: now,
          chips: insight.chips ? [...insight.chips.slice(0, -1), syncTimeLabel()] : insight.chips,
        };
      case 'approvals':
        return {
          ...insight,
          updatedAt: now,
          confidence: insight.confidence
            ? { ...insight.confidence, label: 'Actueel' }
            : insight.confidence,
        };
      default:
        return insight;
    }
  });
}

const INITIAL_BY_ID = new Map(getInitialTodayReadyInsights().map((i) => [i.id, i] as const));

export function applyExecute(
  insights: TodayReadyInsight[],
  intentId: DemoIntentId,
): TodayReadyInsight[] {
  switch (intentId) {
    case 'PRICING_OPTIMIZATION':
    case 'PRODUCT_PRICE_PROPOSAL':
      return updateInsight(insights, 'pricing', { executed: true, exiting: true });
    case 'SUPPLIER_CHECK':
      return demoteInsight(insights, 'supplier');
    case 'HIGH_RISK_APPROVALS':
      return updateInsight(insights, 'approvals', { executed: true, exiting: true });
    case 'COMPOUND_WORKFLOW': {
      let next = updateInsight(insights, 'pricing', { executed: true, exiting: true });
      return demoteInsight(next, 'supplier');
    }
    case 'AUTONOMOUS_ACTION': {
      let next = updateInsight(insights, 'pricing', { executed: true, exiting: true });
      next = updateInsight(next, 'autonomous', { executed: true, exiting: false });
      return next;
    }
    case 'RETURN_RISK_ORDERS':
      return demoteInsight(insights, 'returns');
    case 'MARGIN_INSIGHT':
      return demoteInsight(insights, 'margins');
    case 'BUSINESS_SUMMARY':
      return demoteInsight(insights, 'summary');
    default:
      return insights;
  }
}

export function applyUndoRevert(
  insights: TodayReadyInsight[],
  intentId: DemoIntentId,
): TodayReadyInsight[] {
  const restore = (id: TodayReadyInsightId) => {
    const initial = INITIAL_BY_ID.get(id);
    if (!initial) return insights;
    return insights.map((i) =>
      i.id === id
        ? {
            ...initial,
            visible: i.visible || initial.visible,
            executed: false,
            exiting: false,
            updatedAt: Date.now(),
          }
        : i,
    );
  };

  switch (intentId) {
    case 'PRICING_OPTIMIZATION':
    case 'PRODUCT_PRICE_PROPOSAL':
    case 'AUTONOMOUS_ACTION':
      return restore('pricing');
    case 'SUPPLIER_CHECK':
      return restore('supplier');
    case 'COMPOUND_WORKFLOW': {
      let next = restore('pricing');
      next = restore('supplier');
      return next;
    }
    default:
      return insights;
  }
}

export function finalizeExiting(insights: TodayReadyInsight[]): TodayReadyInsight[] {
  return insights.filter((i) => !i.exiting).map((i) => ({ ...i, justAppeared: undefined }));
}

export function clearJustAppeared(insights: TodayReadyInsight[]): TodayReadyInsight[] {
  return insights.map((i) => ({ ...i, justAppeared: undefined }));
}
