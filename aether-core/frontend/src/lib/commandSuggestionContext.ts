import type { DashboardSummary } from './api';
import type { MerchantSettings } from './settings/merchantSettingsTypes';
import { applyMerchantAutonomyFromSuggestion } from './settings/applyMerchantAutonomy';
import type { DemoIntentId, DemoSuggestion } from './localIntentMatcher';
import { getProactiveSuggestions } from './proactiveSuggestionsDemo';
import type { TodayReadyInsight } from './todayReadyDemo';

export type SuggestionSource = 'static' | 'dashboard' | 'today' | 'proactive';

/** Mirror of future GET /api/admin/suggestions context payload */
export interface SuggestionContextDto {
  pendingApprovals: number;
  lowMarginProducts: number;
  unreadEmails: number;
  visibleTodayReadyIds: string[];
  proactiveIds: string[];
}

export interface ContextualSuggestion extends DemoSuggestion {
  source: SuggestionSource;
  priority: number;
  badge?: string;
}

export interface SuggestionBuildInput {
  dashboard: DashboardSummary | null;
  todayReady: TodayReadyInsight[];
  settings?: MerchantSettings;
}

function toContextDto(input: SuggestionBuildInput): SuggestionContextDto {
  const visible = input.todayReady.filter((i) => i.visible && !i.exiting);
  const proactive = getProactiveSuggestions(input.settings);
  return {
    pendingApprovals: input.dashboard?.pendingApprovals ?? 0,
    lowMarginProducts: input.dashboard?.lowMarginProducts ?? 0,
    unreadEmails: input.dashboard?.unreadEmails ?? 0,
    visibleTodayReadyIds: visible.map((i) => i.id),
    proactiveIds: proactive.map((p) => p.id),
  };
}

export function buildContextualSuggestions(input: SuggestionBuildInput): ContextualSuggestion[] {
  const items: ContextualSuggestion[] = [];
  const { dashboard, todayReady, settings } = input;

  if (dashboard && dashboard.pendingApprovals > 0) {
    const n = dashboard.pendingApprovals;
    items.push({
      id: `ctx-approvals-${n}`,
      label: n === 1 ? 'Behandel 1 goedkeuring' : `Behandel ${n} goedkeuringen`,
      command: 'Toon high-risk goedkeuringen',
      intentId: 'HIGH_RISK_APPROVALS',
      category: 'goedkeuringen',
      hint: 'Direct vanuit je wachtrij',
      executionMode: 'approval_required',
      source: 'dashboard',
      priority: 10,
      badge: 'Nu relevant',
    });
  }

  if (dashboard && dashboard.lowMarginProducts > 0) {
    const n = dashboard.lowMarginProducts;
    items.push({
      id: `ctx-margin-${n}`,
      label: `Optimaliseer ${n} lage-marge SKU's`,
      command: 'Optimaliseer mijn prijzen deze week',
      intentId: 'PRICING_OPTIMIZATION',
      category: 'prijs',
      hint: 'Dashboard signaleert marge-druk',
      executionMode: 'autonomous',
      source: 'dashboard',
      priority: 9,
      badge: 'Nu relevant',
    });
  }

  for (const card of todayReady) {
    if (!card.visible || card.exiting || card.executed) continue;
    if (card.id === 'pricing') {
      items.push({
        id: 'ctx-today-pricing',
        label: 'Publiceer prijsactie Earbuds Pro',
        command: 'Optimaliseer mijn prijzen deze week',
        intentId: 'PRICING_OPTIMIZATION',
        category: 'prijs',
        hint: card.title,
        executionMode: 'autonomous',
        source: 'today',
        priority: 8,
        badge: 'Vandaag klaar',
      });
    }
    if (card.id === 'supplier') {
      items.push({
        id: 'ctx-today-supplier',
        label: 'Sync Nordic Components nu',
        command: 'Check leveranciers op prijsdalingen',
        intentId: 'SUPPLIER_CHECK',
        category: 'leverancier',
        hint: card.title,
        executionMode: 'autonomous',
        source: 'today',
        priority: 8,
        badge: 'Vandaag klaar',
      });
    }
    if (card.id === 'approvals') {
      items.push({
        id: 'ctx-today-approvals',
        label: card.title.includes('high-risk') ? card.title : 'Behandel goedkeuringen',
        command: 'Toon high-risk goedkeuringen',
        intentId: 'HIGH_RISK_APPROVALS',
        category: 'goedkeuringen',
        hint: 'In je Today Ready wachtrij',
        executionMode: 'approval_required',
        source: 'today',
        priority: 8,
        badge: 'Vandaag klaar',
      });
    }
  }

  for (const p of getProactiveSuggestions(settings).slice(0, 2)) {
    items.push({
      id: `ctx-proactive-${p.id}`,
      label: p.title.length > 48 ? `${p.title.slice(0, 45)}…` : p.title,
      command: p.command,
      intentId: p.intentId,
      category:
        p.category === 'orders' ? 'inzicht' : p.category === 'marge' ? 'inzicht' : p.category,
      hint: p.impactHint,
      executionMode: p.executionMode,
      source: 'proactive',
      priority: 6,
      badge: 'AETHER stelt voor',
    });
  }

  return items;
}

export function getRelevantContextSuggestions(
  input: SuggestionBuildInput,
  limit = 2,
): ContextualSuggestion[] {
  const seen = new Set<string>();
  return buildContextualSuggestions(input)
    .sort((a, b) => b.priority - a.priority)
    .filter((s) => {
      if (seen.has(s.intentId)) return false;
      seen.add(s.intentId);
      return true;
    })
    .slice(0, limit);
}

export function getTopContextualCommands(
  input: SuggestionBuildInput,
  limit = 3,
): ContextualSuggestion[] {
  return buildContextualSuggestions(input)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}

export function suggestionContextFromInput(input: SuggestionBuildInput): SuggestionContextDto {
  return toContextDto(input);
}
