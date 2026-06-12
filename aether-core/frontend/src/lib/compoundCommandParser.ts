import type { DemoIntentId } from './localIntentMatcher';
import { detectIntent } from './localIntentMatcher';

const COMPOUND_SPLIT =
  /\s+(?:en\s+daarna|daarna|vervolgens|hierna|en\s+vervolgens|en\s+hierna|en\s+sync|,\s*daarna)\s+/i;

export interface CompoundStep {
  text: string;
  intentId: DemoIntentId;
  label: string;
}

export interface CompoundCommand {
  original: string;
  steps: CompoundStep[];
}

const STEP_LABELS: Partial<Record<DemoIntentId, string>> = {
  PRICING_OPTIMIZATION: 'Prijzen optimaliseren',
  PRODUCT_PRICE_PROPOSAL: 'Productprijs voorstellen',
  SUPPLIER_CHECK: 'Leverancierssync',
  HIGH_RISK_APPROVALS: 'Goedkeuringen',
  AUTONOMOUS_ACTION: 'Autonome prijsrun',
};

function stepLabel(intentId: DemoIntentId): string {
  return STEP_LABELS[intentId] ?? 'Stap uitvoeren';
}

function inferStepIntent(text: string): DemoIntentId {
  const t = text.toLowerCase();
  if (/nordic|leverancier|sync|voorraad|inkoop/.test(t)) return 'SUPPLIER_CHECK';
  if (/earbuds|wireless|product|voorstel/.test(t)) return 'PRODUCT_PRICE_PROPOSAL';
  if (/prijs|optimaliseer|marge/.test(t)) return 'PRICING_OPTIMIZATION';
  if (/goedkeur|approval/.test(t)) return 'HIGH_RISK_APPROVALS';
  return detectIntent(text).id === 'UNKNOWN' ? 'PRICING_OPTIMIZATION' : detectIntent(text).id;
}

export function parseCompoundCommand(input: string): CompoundCommand | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parts = trimmed
    .split(COMPOUND_SPLIT)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length < 2) return null;

  const steps = parts.slice(0, 2).map((text) => {
    const intentId = inferStepIntent(text);
    return { text, intentId, label: stepLabel(intentId) };
  });

  return { original: trimmed, steps };
}

export function isCompoundCommand(input: string): boolean {
  return parseCompoundCommand(input) != null;
}
