import type { DemoCommandResponse, DemoIntentId } from './localIntentMatcher';
import type { ActionExecutionMode } from './actionAutonomy';
import { applyMerchantAutonomy } from './settings/applyMerchantAutonomy';
import type { MerchantSettings } from './settings/merchantSettingsTypes';

export type TodayReadyInsightId =
  | 'pricing'
  | 'supplier'
  | 'approvals'
  | 'margins'
  | 'autonomous'
  | 'summary'
  | 'returns';

export interface TodayReadyInsight {
  id: TodayReadyInsightId;
  variant: TodayReadyInsightId;
  visible: boolean;
  exiting?: boolean;
  executed: boolean;
  sortOrder: number;
  eyebrow: string;
  title: string;
  accent: 'default' | 'success' | 'warning' | 'danger';
  confidence?: { value: string; label?: string };
  metric?: { label: string; value: string; subValue?: string };
  chips?: string[];
  listItems?: { label: string; risk: string }[];
  listOverflow?: string;
  updatedAt?: number;
  /** True when card just became visible (for enter animation) */
  justAppeared?: boolean;
}

const OVERVIEW_REVEAL_ORDER: TodayReadyInsightId[] = ['pricing', 'supplier', 'approvals'];

function syncTimeLabel(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

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

function bumpOthersSortOrder(
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

function updateInsight(
  insights: TodayReadyInsight[],
  id: TodayReadyInsightId,
  patch: Partial<TodayReadyInsight>,
): TodayReadyInsight[] {
  return insights.map((insight) =>
    insight.id === id ? { ...insight, ...patch, updatedAt: Date.now() } : insight,
  );
}

function promoteToFront(
  insights: TodayReadyInsight[],
  id: TodayReadyInsightId,
): TodayReadyInsight[] {
  const bumped = bumpOthersSortOrder(insights, id, 0);
  return updateInsight(bumped, id, { sortOrder: 0, executed: false, exiting: false });
}

function demoteInsight(
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

function refreshVisibleSiblings(insights: TodayReadyInsight[]): TodayReadyInsight[] {
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

/** Home landing: no demo cards until NL flow reveals them. */
export function getInitialTodayReadyInsightsForHome(): TodayReadyInsight[] {
  return getInitialTodayReadyInsights().map((insight) => ({
    ...insight,
    visible: false,
    executed: false,
    exiting: false,
    justAppeared: false,
  }));
}

export function getInitialTodayReadyInsights(): TodayReadyInsight[] {
  return [
    {
      id: 'pricing',
      variant: 'pricing',
      visible: true,
      executed: false,
      sortOrder: 0,
      eyebrow: 'Prijs',
      title: 'Earbuds Pro · +4,2%',
      accent: 'success',
      confidence: { value: '87%' },
      metric: { label: 'Marge', value: '+€1,2k', subValue: '/ maand' },
    },
    {
      id: 'supplier',
      variant: 'supplier',
      visible: false,
      executed: false,
      sortOrder: 1,
      eyebrow: 'Leverancier',
      title: 'Nordic · inkoop −6,8%',
      accent: 'default',
      chips: ['4 producten', syncTimeLabel()],
    },
    {
      id: 'approvals',
      variant: 'approvals',
      visible: true,
      executed: false,
      sortOrder: 1,
      eyebrow: 'Goedkeuringen',
      title: '4 high-risk',
      accent: 'danger',
      confidence: { value: '4', label: 'Wachten' },
      listItems: [
        { label: 'Bulkprijs · 23 SKU', risk: 'Hoog' },
        { label: 'Mail escalatie', risk: 'Kritiek' },
      ],
      listOverflow: '+2 meer',
    },
    {
      id: 'margins',
      variant: 'margins',
      visible: false,
      executed: false,
      sortOrder: 3,
      eyebrow: 'Marge',
      title: 'Marge per categorie',
      accent: 'default',
      confidence: { value: '31,4%', label: 'Gem. marge' },
      listItems: [
        { label: 'Elektronica · 34,2%', risk: 'Hoog' },
        { label: 'Mode · 28,1%', risk: 'Gemiddeld' },
      ],
      listOverflow: '+3 categorieën',
    },
    {
      id: 'autonomous',
      variant: 'autonomous',
      visible: false,
      executed: false,
      sortOrder: 4,
      eyebrow: 'Autonomie',
      title: '3 SKU · low-risk batch',
      accent: 'success',
      chips: ['low-risk', 'rollback 24u', '+€870/mnd'],
    },
    {
      id: 'returns',
      variant: 'returns',
      visible: false,
      executed: false,
      sortOrder: 6,
      eyebrow: 'Retour',
      title: '2 orders · hoog risico',
      accent: 'warning',
      listItems: [
        { label: '#4821 · Audio bundle', risk: 'Hoog' },
        { label: '#4798 · Earbuds Pro', risk: 'Hoog' },
      ],
    },
    {
      id: 'summary',
      variant: 'summary',
      visible: false,
      executed: false,
      sortOrder: 5,
      eyebrow: 'Week',
      title: 'Sterke week · +12%',
      accent: 'success',
      chips: ['Omzet €48,2k', '312 orders', 'Marge 31,4%'],
    },
  ];
}

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

const INITIAL_BY_ID = new Map(getInitialTodayReadyInsights().map((i) => [i.id, i] as const));

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

/** Maps overview insight cards to demo commands for re-activation */
export function insightIdToDemoCommand(id: TodayReadyInsightId): {
  command: string;
  intentId: DemoIntentId;
} | null {
  switch (id) {
    case 'pricing':
      return {
        command: 'Optimaliseer mijn prijzen deze week',
        intentId: 'PRICING_OPTIMIZATION',
      };
    case 'supplier':
      return { command: 'Check leveranciers op prijsdalingen', intentId: 'SUPPLIER_CHECK' };
    case 'approvals':
      return { command: 'Toon high-risk goedkeuringen', intentId: 'HIGH_RISK_APPROVALS' };
    case 'margins':
      return { command: 'Toon marge per categorie', intentId: 'MARGIN_INSIGHT' };
    case 'autonomous':
      return {
        command: 'Voer low-risk prijsaanpassingen automatisch uit',
        intentId: 'AUTONOMOUS_ACTION',
      };
    case 'returns':
      return { command: 'Toon orders met hoge retourkans', intentId: 'RETURN_RISK_ORDERS' };
    case 'summary':
      return {
        command: 'Hoe presteert mijn business deze week?',
        intentId: 'BUSINESS_SUMMARY',
      };
    default:
      return null;
  }
}

const INSIGHT_AUTONOMY_INPUT: Record<
  TodayReadyInsightId,
  { riskBand: 'low' | 'medium' | 'high'; requiresApproval?: boolean; marginImpactEuro?: number }
> = {
  pricing: { riskBand: 'low' },
  supplier: { riskBand: 'low' },
  autonomous: { riskBand: 'low', marginImpactEuro: 870 },
  approvals: { riskBand: 'high', requiresApproval: true },
  margins: { riskBand: 'medium' },
  returns: { riskBand: 'medium' },
  summary: { riskBand: 'low' },
};

export function executionModeForTodayReadyInsight(
  settings: MerchantSettings,
  insightId: TodayReadyInsightId,
): ActionExecutionMode {
  return applyMerchantAutonomy(settings, INSIGHT_AUTONOMY_INPUT[insightId]);
}
