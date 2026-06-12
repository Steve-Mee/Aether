import type { ActionExecutionMode } from './actionAutonomy';
import type { DemoIntentId, LinkedInsightId } from './localIntentMatcher';
import { applyMerchantAutonomyFromSuggestion } from './settings/applyMerchantAutonomy';
import type { MerchantSettings } from './settings/merchantSettingsTypes';

export type ProactiveCategory = 'prijs' | 'leverancier' | 'orders' | 'marge';

export interface ProactiveSuggestion {
  id: string;
  title: string;
  impactHint?: string;
  category: ProactiveCategory;
  intentId: DemoIntentId;
  command: string;
  linkedInsightId: LinkedInsightId;
  executionMode: ActionExecutionMode;
}

const STORAGE_KEY = 'aether_proactive_suggestions';
const SNOOZE_TTL_MS = 24 * 60 * 60 * 1000;

interface SuggestionStateEntry {
  dismissed?: boolean;
  snoozedUntil?: number;
}

type SuggestionStateMap = Record<string, SuggestionStateEntry>;

export const PROACTIVE_SUGGESTIONS: ProactiveSuggestion[] = [
  {
    id: 'proactive-autonomous-pricing',
    title: '3 low-risk prijsaanpassingen kunnen automatisch worden uitgevoerd',
    impactHint: '+€870 marge',
    category: 'prijs',
    intentId: 'AUTONOMOUS_ACTION',
    command: 'Voer low-risk prijsaanpassingen automatisch uit',
    linkedInsightId: 'autonomous',
    executionMode: 'autonomous',
  },
  {
    id: 'proactive-bulk-price-approval',
    title: 'Bulkprijs voor 23 SKU wacht op jouw goedkeuring',
    impactHint: 'Hoog risico',
    category: 'prijs',
    intentId: 'HIGH_RISK_APPROVALS',
    command: 'Toon high-risk goedkeuringen',
    linkedInsightId: 'approvals',
    executionMode: 'approval_required',
  },
  {
    id: 'proactive-supplier-nordic',
    title: 'Leverancier Nordic Components heeft 4 producten significant in prijs verlaagd',
    category: 'leverancier',
    intentId: 'SUPPLIER_CHECK',
    command: 'Check leveranciers op prijsdalingen',
    linkedInsightId: 'supplier',
    executionMode: 'autonomous',
  },
  {
    id: 'proactive-return-risk',
    title: 'Je hebt 2 orders met hoge retourkans deze maand',
    category: 'orders',
    intentId: 'RETURN_RISK_ORDERS',
    command: 'Toon orders met hoge retourkans',
    linkedInsightId: 'returns',
    executionMode: 'inform_only',
  },
  {
    id: 'proactive-margin-audio',
    title: "Marge op categorie 'Audio' is deze week 4,2% lager dan gemiddeld",
    category: 'marge',
    intentId: 'MARGIN_INSIGHT',
    command: 'Toon marge per categorie',
    linkedInsightId: 'margins',
    executionMode: 'inform_only',
  },
];

function loadState(): SuggestionStateMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SuggestionStateMap) : {};
  } catch {
    return {};
  }
}

function saveState(map: SuggestionStateMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function isHidden(id: string, state: SuggestionStateMap): boolean {
  const entry = state[id];
  if (!entry) return false;
  if (entry.dismissed) return true;
  if (entry.snoozedUntil != null && entry.snoozedUntil > Date.now()) return true;
  if (entry.snoozedUntil != null && entry.snoozedUntil <= Date.now()) {
    const next = { ...entry };
    delete next.snoozedUntil;
    if (Object.keys(next).length === 0) {
      const map = loadState();
      delete map[id];
      saveState(map);
    }
    return false;
  }
  return false;
}

export function getProactiveSuggestions(settings?: MerchantSettings): ProactiveSuggestion[] {
  const state = loadState();
  const visible = PROACTIVE_SUGGESTIONS.filter((s) => !isHidden(s.id, state));
  if (!settings) return visible;
  return visible.map((s) => ({
    ...s,
    executionMode: applyMerchantAutonomyFromSuggestion(settings, s),
  }));
}

export function dismissSuggestion(id: string): void {
  const map = loadState();
  map[id] = { ...map[id], dismissed: true };
  saveState(map);
}

export function snoozeSuggestion(id: string): void {
  const map = loadState();
  map[id] = { ...map[id], snoozedUntil: Date.now() + SNOOZE_TTL_MS };
  saveState(map);
}

export function resetProactiveSuggestionState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
