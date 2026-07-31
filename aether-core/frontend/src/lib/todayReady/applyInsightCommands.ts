import type { DemoCommandResponse } from '../localIntentMatcher';
import { syncTimeLabel } from './initialInsights';
import {
  promoteToFront,
  refreshVisibleSiblings,
  updateInsight,
} from './insightLifecycle';
import type { TodayReadyInsight, TodayReadyInsightId } from './types';

const OVERVIEW_REVEAL_ORDER: TodayReadyInsightId[] = ['pricing', 'supplier', 'approvals'];

function parseApprovalHighlights(highlights: string[]): {
  listItems: { label: string; risk: string }[];
  listOverflow?: string;
} {
  const listItems: { label: string; risk: string }[] = [];
  let listOverflow: string | undefined;

  for (const line of highlights) {
    const match = line.match(/^(.+?)\s*\(([^)]+)\)$/);
    if (match) {
      listItems.push({ label: match[1]!.trim(), risk: capitalizeRisk(match[2]!.trim()) });
    } else if (line.startsWith('+')) {
      listOverflow = line;
    }
  }

  return { listItems, listOverflow };
}

function parseMarginHighlights(highlights: string[]): {
  listItems: { label: string; risk: string }[];
  listOverflow?: string;
} {
  const listItems: { label: string; risk: string }[] = [];
  let listOverflow: string | undefined;

  for (const line of highlights) {
    const match = line.match(/^(.+?)\s*\(([^)]+)\)$/);
    if (match) {
      listItems.push({ label: match[1]!.trim(), risk: capitalizeRisk(match[2]!.trim()) });
    } else if (line.startsWith('+')) {
      listOverflow = line;
    }
  }

  return { listItems, listOverflow };
}

function capitalizeRisk(risk: string): string {
  const lower = risk.toLowerCase();
  if (lower === 'kritiek') return 'Kritiek';
  if (lower === 'hoog') return 'Hoog';
  if (lower === 'gemiddeld') return 'Gemiddeld';
  if (lower === 'laag') return 'Laag';
  return risk.charAt(0).toUpperCase() + risk.slice(1);
}

export function applyInsightsOverview(insights: TodayReadyInsight[]): TodayReadyInsight[] {
  return insights.map((insight) => {
    const overviewIndex = OVERVIEW_REVEAL_ORDER.indexOf(insight.id);
    if (overviewIndex === -1) return insight;

    return {
      ...insight,
      visible: true,
      exiting: false,
      executed: false,
      sortOrder: overviewIndex,
      justAppeared: !insight.visible ? true : undefined,
      updatedAt: !insight.visible ? Date.now() : insight.updatedAt,
    };
  });
}

function applyPricingOptimization(
  insights: TodayReadyInsight[],
  response: DemoCommandResponse,
): TodayReadyInsight[] {
  let next = promoteToFront(insights, 'pricing');
  next = updateInsight(next, 'pricing', {
    visible: true,
    title: '3 SKU · klaar',
    confidence: { value: response.metricValue ?? '87%' },
    metric: {
      label: response.impactLabel ?? 'Impact',
      value: response.impactValue ?? '+€1,2k/mnd',
    },
    justAppeared: undefined,
  });
  return next;
}

function applyProductPriceProposal(
  insights: TodayReadyInsight[],
  response: DemoCommandResponse,
): TodayReadyInsight[] {
  let next = promoteToFront(insights, 'pricing');
  next = updateInsight(next, 'pricing', {
    visible: true,
    title: 'Earbuds Pro · +4,2%',
    confidence: { value: response.metricValue ?? '91%' },
    metric: {
      label: response.impactLabel ?? 'Marge',
      value: response.impactValue ?? '+€420',
    },
    justAppeared: undefined,
  });
  return next;
}

function supplierTitleFromResponse(response: DemoCommandResponse): string {
  const saving = response.impactValue ?? '−6,8%';
  return `Nordic · inkoop ${saving}`;
}

function supplierChipsFromResponse(response: DemoCommandResponse): string[] {
  const count = response.metricValue ?? '4';
  const syncHighlight = response.highlights.find((h) => /sync/i.test(h));
  const syncTime = syncHighlight?.match(/\d{2}:\d{2}/)?.[0] ?? syncTimeLabel();
  const label = response.metricLabel === 'Producten' ? `${count} producten` : `${count} SKU`;
  return [label, syncTime];
}

function applySupplierCheck(
  insights: TodayReadyInsight[],
  response: DemoCommandResponse,
): TodayReadyInsight[] {
  const wasHidden = insights.find((i) => i.id === 'supplier')?.visible === false;
  let next = promoteToFront(insights, 'supplier');
  next = updateInsight(next, 'supplier', {
    visible: true,
    title: supplierTitleFromResponse(response),
    chips: supplierChipsFromResponse(response),
    justAppeared: wasHidden ? true : undefined,
  });
  return next;
}

function applyHighRiskApprovals(
  insights: TodayReadyInsight[],
  response: DemoCommandResponse,
): TodayReadyInsight[] {
  const { listItems, listOverflow } = parseApprovalHighlights(response.highlights);
  let next = promoteToFront(insights, 'approvals');
  next = updateInsight(next, 'approvals', {
    visible: true,
    title: `${response.metricValue ?? '4'} high-risk`,
    confidence: { value: response.metricValue ?? '4', label: 'Wachten' },
    listItems: listItems.length > 0 ? listItems : undefined,
    listOverflow,
    justAppeared: undefined,
  });
  return next;
}

function applyMarginInsight(
  insights: TodayReadyInsight[],
  response: DemoCommandResponse,
): TodayReadyInsight[] {
  const { listItems, listOverflow } = parseMarginHighlights(response.highlights);
  const wasHidden = insights.find((i) => i.id === 'margins')?.visible === false;
  let next = promoteToFront(insights, 'margins');
  next = updateInsight(next, 'margins', {
    visible: true,
    title: 'Marge per categorie',
    confidence: { value: response.metricValue ?? '31,4%', label: 'Gem. marge' },
    listItems: listItems.length > 0 ? listItems : undefined,
    listOverflow,
    justAppeared: wasHidden ? true : undefined,
  });
  return next;
}

function applyAutonomousAction(
  insights: TodayReadyInsight[],
  response: DemoCommandResponse,
): TodayReadyInsight[] {
  const wasHidden = insights.find((i) => i.id === 'autonomous')?.visible === false;

  let next = updateInsight(insights, 'pricing', {
    visible: true,
    title: '3 SKU · autonoom klaar',
    confidence: undefined,
    metric: {
      label: response.impactLabel ?? 'Impact',
      value: response.impactValue ?? '+€870/mnd',
    },
    chips: undefined,
  });

  next = promoteToFront(next, 'autonomous');
  next = updateInsight(next, 'autonomous', {
    visible: true,
    title: '3 SKU · low-risk batch',
    chips: ['low-risk', 'rollback 24u', response.impactValue ?? '+€870/mnd'],
    justAppeared: wasHidden ? true : undefined,
  });

  return next;
}

function parseReturnHighlights(highlights: string[]): {
  listItems: { label: string; risk: string }[];
} {
  const listItems: { label: string; risk: string }[] = [];
  for (const line of highlights) {
    const match = line.match(/^(.+?)\s*\(([^)]+)\)$/);
    if (match) {
      listItems.push({ label: match[1]!.trim(), risk: capitalizeRisk(match[2]!.trim()) });
    } else if (line.startsWith('#')) {
      listItems.push({ label: line.split('·')[0]!.trim(), risk: 'Hoog' });
    }
  }
  return { listItems };
}

function applyReturnRiskOrders(
  insights: TodayReadyInsight[],
  response: DemoCommandResponse,
): TodayReadyInsight[] {
  const { listItems } = parseReturnHighlights(response.highlights);
  const wasHidden = insights.find((i) => i.id === 'returns')?.visible === false;
  let next = promoteToFront(insights, 'returns');
  next = updateInsight(next, 'returns', {
    visible: true,
    title: `${response.metricValue ?? '2'} orders · hoog risico`,
    confidence: { value: response.metricValue ?? '2', label: 'Orders' },
    listItems: listItems.length > 0 ? listItems : undefined,
    justAppeared: wasHidden ? true : undefined,
  });
  return next;
}

function summaryChipsFromResponse(response: DemoCommandResponse): string[] {
  const kpiLines = response.highlights.filter((h) => !h.startsWith('+') && !h.startsWith('Top'));
  return kpiLines.slice(0, 3);
}

function applyBusinessSummary(
  insights: TodayReadyInsight[],
  response: DemoCommandResponse,
): TodayReadyInsight[] {
  const wasHidden = insights.find((i) => i.id === 'summary')?.visible === false;
  let next = refreshVisibleSiblings(insights);
  next = promoteToFront(next, 'summary');
  next = updateInsight(next, 'summary', {
    visible: true,
    title: `Sterke week · ${response.impactValue ?? '+12%'}`,
    chips: summaryChipsFromResponse(response),
    justAppeared: wasHidden ? true : undefined,
  });
  return next;
}

export function applyCommandComplete(
  insights: TodayReadyInsight[],
  response: DemoCommandResponse,
): TodayReadyInsight[] {
  switch (response.intentId) {
    case 'PRICING_OPTIMIZATION':
      return applyPricingOptimization(insights, response);
    case 'PRODUCT_PRICE_PROPOSAL':
      return applyProductPriceProposal(insights, response);
    case 'SUPPLIER_CHECK':
      return applySupplierCheck(insights, response);
    case 'HIGH_RISK_APPROVALS':
      return applyHighRiskApprovals(insights, response);
    case 'INSIGHTS_OVERVIEW':
      return applyInsightsOverview(insights);
    case 'MARGIN_INSIGHT':
      return applyMarginInsight(insights, response);
    case 'AUTONOMOUS_ACTION':
      return applyAutonomousAction(insights, response);
    case 'RETURN_RISK_ORDERS':
      return applyReturnRiskOrders(insights, response);
    case 'BUSINESS_SUMMARY':
      return applyBusinessSummary(insights, response);
    case 'COMPOUND_WORKFLOW': {
      let next = applyProductPriceProposal(insights, response);
      next = applySupplierCheck(next, response);
      return next;
    }
    default:
      return insights;
  }
}
