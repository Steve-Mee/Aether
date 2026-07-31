import type { DemoIntentId } from './types';
import { INTENT_SPECIFICITY } from './metadata';

export interface IntentRule {
  id: DemoIntentId;
  patterns: { re: RegExp; weight: number }[];
  negativePatterns?: RegExp[];
  base: number;
}
export const INTENT_RULES: IntentRule[] = [
  {
    id: 'COMPOUND_WORKFLOW',
    patterns: [
      { re: /\bdaarna\b/, weight: 4 },
      { re: /\bvervolgens\b/, weight: 4 },
      { re: /\ben\s+sync\b/, weight: 4 },
      { re: /\ben\s+check\b/, weight: 3 },
      { re: /,\s*daarna/, weight: 3 },
    ],
    base: 0.92,
  },
  {
    id: 'PRODUCT_PRICE_PROPOSAL',
    patterns: [
      { re: /voorstel/, weight: 3 },
      { re: /wireless/, weight: 2 },
      { re: /earbuds/, weight: 2 },
      { re: /product.*prijs/, weight: 3 },
      { re: /prijs.*voor/, weight: 2 },
      { re: /verhoog.*prijs/, weight: 3 },
      { re: /prijs.*verhoog/, weight: 3 },
    ],
    base: 0.89,
  },
  {
    id: 'AUTONOMOUS_ACTION',
    patterns: [
      { re: /autonom/, weight: 3 },
      { re: /automatisch/, weight: 3 },
      { re: /low.?risk/, weight: 3 },
      { re: /zonder goedkeur/, weight: 2 },
      { re: /batch/, weight: 2 },
      { re: /uitvoer.*prijs/, weight: 2 },
      { re: /prijsaanpass/, weight: 2 },
    ],
    negativePatterns: [/voorstel/, /earbuds/],
    base: 0.88,
  },
  {
    id: 'RETURN_RISK_ORDERS',
    patterns: [
      { re: /retour/, weight: 3 },
      { re: /return/, weight: 3 },
      { re: /retourkans/, weight: 4 },
      { re: /orders.*risico/, weight: 3 },
      { re: /risico.*order/, weight: 3 },
    ],
    base: 0.86,
  },
  {
    id: 'MARGIN_INSIGHT',
    patterns: [
      { re: /marge/, weight: 2 },
      { re: /margin/, weight: 2 },
      { re: /categor/, weight: 3 },
      { re: /per categor/, weight: 3 },
      { re: /inzicht.*marge/, weight: 3 },
      { re: /toon marge/, weight: 3 },
    ],
    negativePatterns: [/optimalis/, /verhoog/, /verlaag/, /retour/],
    base: 0.87,
  },
  {
    id: 'BUSINESS_SUMMARY',
    patterns: [
      { re: /presteert/, weight: 3 },
      { re: /business/, weight: 2 },
      { re: /omzet/, weight: 2 },
      { re: /samenvatting/, weight: 2 },
      { re: /overzicht.*week/, weight: 3 },
      { re: /kpi/, weight: 2 },
      { re: /week/, weight: 1 },
    ],
    negativePatterns: [/vandaag/, /klaar voor/],
    base: 0.86,
  },
  {
    id: 'HIGH_RISK_APPROVALS',
    patterns: [
      { re: /goedkeur/, weight: 3 },
      { re: /approval/, weight: 2 },
      { re: /high.?risk/, weight: 3 },
      { re: /wacht.*besl/, weight: 2 },
      { re: /urgent/, weight: 2 },
    ],
    base: 0.88,
  },
  {
    id: 'SUPPLIER_CHECK',
    patterns: [
      { re: /leverancier/, weight: 3 },
      { re: /supplier/, weight: 2 },
      { re: /inkoop/, weight: 2 },
      { re: /prijsdaling/, weight: 3 },
      { re: /sync/, weight: 2 },
      { re: /nordic/, weight: 2 },
      { re: /voorraad/, weight: 2 },
      { re: /sync.*nordic/, weight: 3 },
    ],
    base: 0.86,
  },
  {
    id: 'PRICING_OPTIMIZATION',
    patterns: [
      { re: /optimalis/, weight: 3 },
      { re: /prijs/, weight: 1 },
      { re: /verhoog/, weight: 2 },
      { re: /verlaag/, weight: 2 },
    ],
    negativePatterns: [/voorstel/, /automatisch/, /autonom/, /categor/],
    base: 0.87,
  },
  {
    id: 'INSIGHTS_OVERVIEW',
    patterns: [
      { re: /vandaag/, weight: 3 },
      { re: /klaar/, weight: 2 },
      { re: /wat moet ik/, weight: 4 },
      { re: /wat kan ik/, weight: 3 },
      { re: /nu doen/, weight: 3 },
      { re: /status/, weight: 1 },
      { re: /overzicht/, weight: 1 },
      { re: /inzicht/, weight: 1 },
      { re: /insight/, weight: 1 },
    ],
    negativePatterns: [/week/, /presteert/, /business/, /omzet/],
    base: 0.84,
  },
];

export const MIN_SCORE_THRESHOLD = 2;
export function normalize(text: string): string {
  return text.toLowerCase().trim();
}
export function scoreRule(rule: IntentRule, text: string): number {
  let score = 0;
  for (const { re, weight } of rule.patterns) {
    if (re.test(text)) score += weight;
  }
  if (rule.negativePatterns) {
    for (const neg of rule.negativePatterns) {
      if (neg.test(text)) score -= 2;
    }
  }
  return score;
}
export function specificityRank(id: DemoIntentId): number {
  const idx = INTENT_SPECIFICITY.indexOf(id);
  return idx === -1 ? 999 : idx;
}
