import type { ActionExecutionMode } from './actionAutonomy';
import type { CommandResult } from '@/types/command';
import {
  buildContextualSuggestions,
  type ContextualSuggestion,
  type SuggestionBuildInput,
} from './commandSuggestionContext';
export type { SuggestionBuildInput };
import { isCompoundCommand, parseCompoundCommand } from './compoundCommandParser';
export type DemoIntentId =
  | 'PRICING_OPTIMIZATION'
  | 'PRODUCT_PRICE_PROPOSAL'
  | 'SUPPLIER_CHECK'
  | 'HIGH_RISK_APPROVALS'
  | 'INSIGHTS_OVERVIEW'
  | 'MARGIN_INSIGHT'
  | 'AUTONOMOUS_ACTION'
  | 'BUSINESS_SUMMARY'
  | 'RETURN_RISK_ORDERS'
  | 'COMPOUND_WORKFLOW'
  | 'UNKNOWN';
export type LinkedInsightId =
  | 'pricing'
  | 'supplier'
  | 'approvals'
  | 'margins'
  | 'autonomous'
  | 'summary'
  | 'returns'
  | null;
export type SuggestionCategory =
  | 'prijs'
  | 'leverancier'
  | 'goedkeuringen'
  | 'inzicht'
  | 'autonomie'
  | 'overzicht';
export interface DemoIntentMatch {
  id: DemoIntentId;
  label: string;
  confidence: number;
}
export interface DemoSuggestion {
  id: string;
  label: string;
  command: string;
  intentId: DemoIntentId;
  category: SuggestionCategory;
  hint?: string;
  executionMode?: ActionExecutionMode;
  source?: 'static' | 'dashboard' | 'today' | 'proactive';
  priority?: number;
  badge?: string;
}

export interface CompoundStepResult {
  label: string;
  intentId: DemoIntentId;
  summary: string;
  done: boolean;
}
export type DemoResponseVariant = 'default' | 'summary';
export interface DemoSecondaryMetric {
  label: string;
  value: string;
}
export interface DemoCommandResponse extends CommandResult {
  intentId: DemoIntentId;
  summary: string;
  highlights: string[];
  metricLabel?: string;
  metricValue?: string;
  preparedHeadline: string;
  impactLabel?: string;
  impactValue?: string;
  linkedInsightId: LinkedInsightId;
  executionConfirmation?: string;
  executeLabel?: string;
  responseVariant?: DemoResponseVariant;
  secondaryMetrics?: DemoSecondaryMetric[];
  gateTitle?: string;
  gateSummary?: string;
  gateImpact?: string;
  gateRiskDetail?: string;
  undoable?: boolean;
  undoWindowLabel?: string;
  compoundSteps?: CompoundStepResult[];
  postExecuteActions?: ('undo' | 'adjust' | 'explain')[];
}
export const DEMO_SUGGESTIONS: DemoSuggestion[] = [
  {
    id: 'pricing-week',
    label: 'Optimaliseer prijzen deze week',
    command: 'Optimaliseer mijn prijzen deze week',
    intentId: 'PRICING_OPTIMIZATION',
    category: 'prijs',
    hint: "3 SKU's met veilige marge-verhoging",
    executionMode: 'autonomous',
  },
  {
    id: 'earbuds-proposal',
    label: 'Prijsvoorstel Wireless Earbuds Pro',
    command: 'Maak een prijsvoorstel voor Wireless Earbuds Pro',
    intentId: 'PRODUCT_PRICE_PROPOSAL',
    category: 'prijs',
    hint: 'Product-specifiek voorstel op basis van markt',
    executionMode: 'autonomous',
  },
  {
    id: 'supplier-drops',
    label: 'Check leveranciers op prijsdalingen',
    command: 'Check leveranciers op prijsdalingen',
    intentId: 'SUPPLIER_CHECK',
    category: 'leverancier',
    hint: 'Inkoopdalingen en sync-voorbereiding',
    executionMode: 'autonomous',
  },
  {
    id: 'high-risk',
    label: 'Toon high-risk goedkeuringen',
    command: 'Toon high-risk goedkeuringen',
    intentId: 'HIGH_RISK_APPROVALS',
    category: 'goedkeuringen',
    hint: '4 items wachten op jouw besluit',
    executionMode: 'approval_required',
  },
  {
    id: 'margin-category',
    label: 'Toon marge per categorie',
    command: 'Toon marge per categorie',
    intentId: 'MARGIN_INSIGHT',
    category: 'inzicht',
    hint: 'Breakdown per productcategorie',
    executionMode: 'inform_only',
  },
  {
    id: 'autonomous-pricing',
    label: 'Voer low-risk prijsaanpassingen uit',
    command: 'Voer low-risk prijsaanpassingen automatisch uit',
    intentId: 'AUTONOMOUS_ACTION',
    category: 'autonomie',
    hint: "3 SKU's zonder goedkeuring, rollback 24u",
    executionMode: 'autonomous',
  },
  {
    id: 'business-week',
    label: 'Hoe presteert mijn business deze week?',
    command: 'Hoe presteert mijn business deze week?',
    intentId: 'BUSINESS_SUMMARY',
    category: 'overzicht',
    hint: 'Omzet, orders en marge vs. vorige week',
    executionMode: 'inform_only',
  },
  {
    id: 'insights-today',
    label: 'Wat staat vandaag klaar?',
    command: 'Wat staat vandaag klaar voor mij?',
    intentId: 'INSIGHTS_OVERVIEW',
    category: 'overzicht',
    hint: 'Alle voorbereide acties in één overzicht',
  },
  {
    id: 'compound-earbuds-nordic',
    label: 'Prijzen + Nordic sync',
    command: 'Optimaliseer prijzen voor Wireless Earbuds en sync daarna de voorraad bij Nordic',
    intentId: 'COMPOUND_WORKFLOW',
    category: 'prijs',
    hint: '2 stappen: prijsoptimalisatie → leverancierssync',
    executionMode: 'autonomous',
  },
  {
    id: 'compound-pricing-supplier',
    label: 'Optimaliseer prijzen en check leveranciers',
    command: 'Optimaliseer mijn prijzen deze week en check daarna leveranciers',
    intentId: 'COMPOUND_WORKFLOW',
    category: 'overzicht',
    hint: 'Multi-step workflow met tussentijdse feedback',
    executionMode: 'autonomous',
  },
  {
    id: 'compound-approvals-margin',
    label: 'Goedkeuringen + marge-inzicht',
    command: 'Toon high-risk goedkeuringen en toon daarna marge per categorie',
    intentId: 'COMPOUND_WORKFLOW',
    category: 'goedkeuringen',
    hint: '2 stappen: beslissen → inzicht',
    executionMode: 'approval_required',
  },
  {
    id: 'compound-earbuds-check',
    label: 'Earbuds voorstel + leveranciers',
    command: 'Maak een prijsvoorstel voor Wireless Earbuds Pro en check daarna leveranciers',
    intentId: 'COMPOUND_WORKFLOW',
    category: 'prijs',
    hint: 'Productprijs gevolgd door inkoop-sync',
    executionMode: 'autonomous',
  },
];
export const IDLE_SUGGESTION_IDS = [
  'pricing-week',
  'supplier-drops',
  'margin-category',
  'high-risk',
  'autonomous-pricing',
  'business-week',
] as const;
const CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  prijs: 'Prijzen',
  leverancier: 'Leveranciers',
  goedkeuringen: 'Goedkeuringen',
  inzicht: 'Inzichten',
  autonomie: 'Autonomie',
  overzicht: 'Overzicht',
};
const INTENT_LABELS: Record<DemoIntentId, string> = {
  PRICING_OPTIMIZATION: 'Prijsoptimalisatie',
  PRODUCT_PRICE_PROPOSAL: 'Productprijs',
  SUPPLIER_CHECK: 'Leveranciers',
  HIGH_RISK_APPROVALS: 'Goedkeuringen',
  INSIGHTS_OVERVIEW: 'Inzichten',
  MARGIN_INSIGHT: 'Marge-inzicht',
  AUTONOMOUS_ACTION: 'Autonome actie',
  BUSINESS_SUMMARY: 'Weekoverzicht',
  RETURN_RISK_ORDERS: 'Retourrisico',
  COMPOUND_WORKFLOW: 'Multi-stap workflow',
  UNKNOWN: 'Algemeen',
};
/** Higher index = lower priority when scores tie */
const INTENT_SPECIFICITY: DemoIntentId[] = [
  'COMPOUND_WORKFLOW',
  'PRODUCT_PRICE_PROPOSAL',
  'RETURN_RISK_ORDERS',
  'AUTONOMOUS_ACTION',
  'MARGIN_INSIGHT',
  'BUSINESS_SUMMARY',
  'HIGH_RISK_APPROVALS',
  'SUPPLIER_CHECK',
  'PRICING_OPTIMIZATION',
  'INSIGHTS_OVERVIEW',
];
const LOADING_PHASES: Record<DemoIntentId, string[]> = {
  PRICING_OPTIMIZATION: [
    'Intent herkend…',
    "3 SKU's geanalyseerd…",
    'Prijsoptimalisatie berekend…',
  ],
  PRODUCT_PRICE_PROPOSAL: ['Product gevonden…', 'Concurrentie vergeleken…', 'Voorstel klaar…'],
  SUPPLIER_CHECK: ['Leveranciers gescand…', 'Prijsdalingen gedetecteerd…', 'Sync voorbereid…'],
  HIGH_RISK_APPROVALS: ['Wachtrij geladen…', 'Risico geclassificeerd…', 'Prioriteiten bepaald…'],
  INSIGHTS_OVERVIEW: ['Dashboard samengevoegd…', 'Acties geprioriteerd…', 'Overzicht klaar…'],
  MARGIN_INSIGHT: ['Categorieën geladen…', 'Marges berekend…', 'Inzicht klaar…'],
  AUTONOMOUS_ACTION: ["Low-risk SKU's gefilterd…", 'Batch voorbereid…', 'Autonome run klaar…'],
  RETURN_RISK_ORDERS: ['Orders gescand…', 'Retourkans berekend…', 'Risico-orders gevonden…'],
  BUSINESS_SUMMARY: ['Weekdata opgehaald…', "KPI's berekend…", 'Samenvatting klaar…'],
  COMPOUND_WORKFLOW: ['Workflow herkend…', 'Stappen gepland…', 'Uitvoering voorbereid…'],
  UNKNOWN: ['Commando geïnterpreteerd…', 'Suggesties voorbereid…'],
};
export interface DemoExplainStep {
  at: string;
  label: string;
  detail?: string;
}
const EXPLAIN_TIMELINES: Record<DemoIntentId, DemoExplainStep[]> = {
  PRICING_OPTIMIZATION: [
    { at: '09:41', label: 'Marge-analyse', detail: "3 SKU's vergeleken met marktgemiddelde" },
    { at: '09:41', label: 'Elasticiteit', detail: 'Vraagcurve berekend op 30 dagen data' },
    { at: '09:42', label: 'Voorstel', detail: 'Earbuds Pro +4,2% binnen veiligheidsband' },
  ],
  PRODUCT_PRICE_PROPOSAL: [
    { at: '09:43', label: 'Product match', detail: 'Wireless Earbuds Pro (SKU-8842)' },
    { at: '09:43', label: 'Concurrentie', detail: '5 vergelijkbare listings gescand' },
    { at: '09:44', label: 'Prijsband', detail: '€89 → €92,87 (+4,2%) binnen policy' },
  ],
  SUPPLIER_CHECK: [
    { at: '09:14', label: 'Sync Nordic Components', detail: '4 producten met inkoopdaling' },
    { at: '09:15', label: 'Marge-impact', detail: 'Doorgeven of marge behouden per categorie' },
    { at: '09:15', label: 'Actie klaar', detail: 'Sync kan direct starten' },
  ],
  HIGH_RISK_APPROVALS: [
    { at: '08:52', label: 'Bulkprijs gedetecteerd', detail: "23 SKU's, risico hoog" },
    { at: '09:01', label: 'Mail escalatie', detail: 'Kritieke thread wacht op besluit' },
    { at: '09:10', label: 'Wachtrij', detail: '4 items vereisen jouw goedkeuring' },
  ],
  INSIGHTS_OVERVIEW: [
    { at: '09:00', label: 'Prijsactie', detail: '1 voorstel klaar voor publicatie' },
    { at: '09:05', label: 'Leverancier', detail: '4 producten sync gereed' },
    { at: '09:08', label: 'Goedkeuringen', detail: '4 high-risk in wachtrij' },
  ],
  MARGIN_INSIGHT: [
    { at: '09:20', label: 'Categorieën', detail: '5 actieve categorieën geanalyseerd' },
    { at: '09:21', label: 'Marge-berekening', detail: 'Bruto marge vs. inkoop per categorie' },
    { at: '09:21', label: 'Inzicht', detail: 'Elektronica leidt op 34,2% marge' },
  ],
  AUTONOMOUS_ACTION: [
    { at: '09:30', label: 'Risico-filter', detail: "3 SKU's binnen low-risk band" },
    { at: '09:31', label: 'Policy check', detail: 'Geen goedkeuring vereist per regels' },
    { at: '09:31', label: 'Batch klaar', detail: 'Verwachte marge +€870 / maand' },
  ],
  RETURN_RISK_ORDERS: [
    { at: '08:45', label: 'Retourmodel', detail: '30 dagen retourhistorie per klantsegment' },
    { at: '08:46', label: 'Orders gescand', detail: '2 orders boven drempel 35% retourkans' },
    { at: '08:46', label: 'Actie klaar', detail: 'Contact of preventieve maatregelen voorstellen' },
  ],
  BUSINESS_SUMMARY: [
    { at: '09:00', label: 'Omzet', detail: '€48,2k deze week (+12% vs. vorige week)' },
    { at: '09:00', label: 'Orders', detail: '312 orders, gem. orderwaarde €154' },
    { at: '09:01', label: 'Marge', detail: 'Bruto marge 31,4% (+0,8pp)' },
  ],
  COMPOUND_WORKFLOW: [
    { at: '09:40', label: 'Stap 1 · Prijzen', detail: 'Wireless Earbuds Pro geoptimaliseerd' },
    { at: '09:41', label: 'Stap 2 · Sync', detail: 'Nordic Components voorraad gesynchroniseerd' },
    { at: '09:41', label: 'Workflow', detail: 'Beide stappen binnen policy uitgevoerd' },
  ],
  UNKNOWN: [
    { at: 'Nu', label: 'Intent onduidelijk', detail: 'Probeer een van de suggesties hieronder' },
  ],
};
interface IntentRule {
  id: DemoIntentId;
  patterns: { re: RegExp; weight: number }[];
  negativePatterns?: RegExp[];
  base: number;
}
const INTENT_RULES: IntentRule[] = [
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
const MIN_SCORE_THRESHOLD = 2;
function normalize(text: string): string {
  return text.toLowerCase().trim();
}
function scoreRule(rule: IntentRule, text: string): number {
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
function specificityRank(id: DemoIntentId): number {
  const idx = INTENT_SPECIFICITY.indexOf(id);
  return idx === -1 ? 999 : idx;
}
export function detectIntent(input: string): DemoIntentMatch {
  const t = normalize(input);
  if (!t) {
    return { id: 'UNKNOWN', label: INTENT_LABELS.UNKNOWN, confidence: 0 };
  }
  if (isCompoundCommand(input)) {
    return {
      id: 'COMPOUND_WORKFLOW',
      label: INTENT_LABELS.COMPOUND_WORKFLOW,
      confidence: 0.91,
    };
  }
  const scored = INTENT_RULES.map((rule) => ({
    rule,
    score: scoreRule(rule, t),
  })).filter(({ score }) => score >= MIN_SCORE_THRESHOLD);
  if (scored.length === 0) {
    return { id: 'UNKNOWN', label: INTENT_LABELS.UNKNOWN, confidence: 0.55 };
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return specificityRank(a.rule.id) - specificityRank(b.rule.id);
  });
  const best = scored[0]!;
  const confidence = Math.min(0.97, best.rule.base + (best.score - MIN_SCORE_THRESHOLD) * 0.02);
  return {
    id: best.rule.id,
    label: INTENT_LABELS[best.rule.id],
    confidence,
  };
}
export function shouldShowIntentPill(match: DemoIntentMatch): boolean {
  return match.id !== 'UNKNOWN' && match.confidence >= 0.75;
}
function scoreSuggestion(s: DemoSuggestion, t: string, intent: DemoIntentMatch): number {
  const hay = `${s.label} ${s.command} ${s.hint ?? ''}`.toLowerCase();
  const tokens = t.split(/\s+/).filter(Boolean);
  let tokenScore = tokens.reduce((acc, tok) => (hay.includes(tok) ? acc + 1 : acc), 0);
  if (t.length >= 2 && hay.startsWith(t.slice(0, 2))) tokenScore += 2;
  const intentBoost = s.intentId === intent.id ? 3 : 0;
  const categoryBoost = s.category === categoryForIntent(intent.id) ? 1 : 0;
  const contextBoost = (s.priority ?? 0) >= 6 ? 2 : 0;
  return tokenScore + intentBoost + categoryBoost + contextBoost;
}

export function mergeAndRankSuggestions(
  input: string,
  contextInput: SuggestionBuildInput | null,
  limit = 6,
): DemoSuggestion[] {
  const t = normalize(input);
  const intent = detectIntent(input);
  const contextual = contextInput ? buildContextualSuggestions(contextInput) : [];
  const pool = new Map<string, DemoSuggestion>();
  for (const s of DEMO_SUGGESTIONS) pool.set(s.id, s);
  for (const c of contextual) {
    if (!pool.has(c.id)) pool.set(c.id, c);
  }
  const all = [...pool.values()];
  if (!t) {
    const idle = getIdleSuggestions();
    const ctxTop = contextual.sort((a, b) => b.priority - a.priority).slice(0, 2);
    const merged = [
      ...ctxTop,
      ...idle.filter((i) => !ctxTop.some((c) => c.intentId === i.intentId)),
    ];
    return merged.slice(0, limit);
  }
  const scored = all.map((s) => ({ s, score: scoreSuggestion(s, t, intent) }));
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.s);
}

export function filterSuggestions(input: string, limit = 6): DemoSuggestion[] {
  return mergeAndRankSuggestions(input, null, limit);
}

export function getContextualSuggestionsForUnknown(
  contextInput: SuggestionBuildInput,
  limit = 2,
): ContextualSuggestion[] {
  return buildContextualSuggestions(contextInput)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}
function categoryForIntent(id: DemoIntentId): SuggestionCategory | null {
  const match = DEMO_SUGGESTIONS.find((s) => s.intentId === id);
  return match?.category ?? null;
}
export function getIdleSuggestions(): DemoSuggestion[] {
  return IDLE_SUGGESTION_IDS.map((id) => DEMO_SUGGESTIONS.find((s) => s.id === id)!);
}
export function groupSuggestionsByCategory(
  suggestions: DemoSuggestion[],
): { category: SuggestionCategory; label: string; items: DemoSuggestion[] }[] {
  const groups = new Map<SuggestionCategory, DemoSuggestion[]>();
  for (const s of suggestions) {
    const list = groups.get(s.category) ?? [];
    list.push(s);
    groups.set(s.category, list);
  }
  const order: SuggestionCategory[] = [
    'prijs',
    'leverancier',
    'goedkeuringen',
    'inzicht',
    'autonomie',
    'overzicht',
  ];
  return order
    .filter((cat) => groups.has(cat))
    .map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      items: groups.get(cat)!,
    }));
}
export function getLoadingPhases(intentId: DemoIntentId): string[] {
  return LOADING_PHASES[intentId] ?? LOADING_PHASES.UNKNOWN;
}

export function getCompoundStepLoadingPhases(
  stepIndex: number,
  stepTotal: number,
  stepIntentId: DemoIntentId,
): string[] {
  const phases = getLoadingPhases(stepIntentId);
  return phases.map((p, i) => `Stap ${stepIndex + 1} van ${stepTotal}: ${p}`);
}

export function buildCompoundDemoResponse(command: string): DemoCommandResponse {
  const compound = parseCompoundCommand(command);
  if (!compound) {
    return buildDemoResponse(command, 'COMPOUND_WORKFLOW');
  }
  const stepResults = compound.steps.map((step) => {
    const sub = buildDemoResponse(step.text, step.intentId);
    return {
      label: step.label,
      intentId: step.intentId,
      summary: sub.result,
      done: true,
    };
  });
  return {
    success: true,
    originalCommand: command,
    parsedIntent: 'COMPOUND_WORKFLOW',
    intentId: 'COMPOUND_WORKFLOW',
    confidence: 0.93,
    timestamp: new Date().toISOString(),
    preparedHeadline: 'Multi-stap workflow afgerond',
    result: `${compound.steps.length} stappen voorbereid en uitgevoerd.`,
    action: 'COMPOUND_EXECUTE',
    requiresApproval: false,
    riskBand: 'low',
    summary:
      'AETHER heeft je commando opgesplitst en elke stap afzonderlijk geanalyseerd — klaar om te publiceren.',
    highlights: stepResults.map((s) => `✓ ${s.label}: ${s.summary}`).slice(0, 3),
    metricLabel: 'Stappen',
    metricValue: String(compound.steps.length),
    impactLabel: 'Impact',
    impactValue: '+€1,6k/mnd',
    linkedInsightId: 'pricing',
    executionConfirmation: 'Workflow uitgevoerd — prijzen en leverancierssync voltooid',
    executeLabel: 'Alles uitvoeren',
    undoable: true,
    undoWindowLabel: '24 uur',
    postExecuteActions: ['undo', 'adjust', 'explain'],
    compoundSteps: stepResults,
    verifiedUplift: 1600,
  };
}
export function getExplainTimeline(intentId: DemoIntentId): DemoExplainStep[] {
  return EXPLAIN_TIMELINES[intentId] ?? EXPLAIN_TIMELINES.UNKNOWN;
}

function demoSpecialistBrain(intentId: DemoIntentId): CommandResult['brain'] | undefined {
  const agentMap: Partial<Record<DemoIntentId, string>> = {
    PRICING_OPTIMIZATION: 'pricing',
    PRODUCT_PRICE_PROPOSAL: 'pricing',
    MARGIN_INSIGHT: 'pricing',
    SUPPLIER_CHECK: 'supplier',
  };
  const agentKey = agentMap[intentId];
  if (!agentKey) return undefined;
  return {
    contextSnippets: [],
    specialist: { agentKey, delegatedFrom: 'admin', routingSource: 'intent' },
  };
}

export function buildDemoResponse(
  command: string,
  intentOverride?: DemoIntentId,
  contextInput?: SuggestionBuildInput | null,
): DemoCommandResponse {
  if (!intentOverride && isCompoundCommand(command)) {
    return buildCompoundDemoResponse(command);
  }
  const intent = intentOverride
    ? { id: intentOverride, label: INTENT_LABELS[intentOverride], confidence: 0.9 }
    : detectIntent(command);
  const base = {
    success: true,
    originalCommand: command,
    parsedIntent: intent.id,
    confidence: intent.confidence,
    timestamp: new Date().toISOString(),
    preparedHeadline: 'AETHER heeft dit voorbereid',
    brain: demoSpecialistBrain(intent.id),
  };
  switch (intent.id) {
    case 'PRODUCT_PRICE_PROPOSAL':
      return {
        ...base,
        intentId: intent.id,
        preparedHeadline: 'Prijsvoorstel klaar om te publiceren',
        result: 'Wireless Earbuds Pro: veilig voorstel binnen je prijsband.',
        action: 'APPLY_PRICE',
        requiresApproval: false,
        riskBand: 'low',
        verifiedUplift: 420,
        summary: 'Markt en marge ondersteunen +4,2% — rollback binnen 24 uur beschikbaar.',
        highlights: ['€89 → €92,87 (+4,2%)', 'Concurrentie binnen band', 'Geen goedkeuring nodig'],
        metricLabel: 'Confidence',
        metricValue: '91%',
        impactLabel: 'Marge',
        impactValue: '+€420',
        linkedInsightId: 'pricing',
        executionConfirmation: 'Prijs bijgewerkt voor Wireless Earbuds Pro',
        executeLabel: 'Automatisch uitvoeren',
        undoable: true,
        undoWindowLabel: '24 uur',
        postExecuteActions: ['undo', 'adjust', 'explain'],
      };
    case 'PRICING_OPTIMIZATION':
      return {
        ...base,
        intentId: intent.id,
        preparedHeadline: 'Prijsoptimalisatie staat klaar',
        result: "3 SKU's kunnen veilig worden bijgesteld — Earbuds Pro leidt.",
        action: 'APPLY_PRICE',
        requiresApproval: false,
        riskBand: 'low',
        verifiedUplift: 1240,
        summary: 'Verwachte marge-impact +€1.240/maand bij publicatie vandaag.',
        highlights: [
          'Confidence 87%',
          'Verwachte marge +€1.240 / maand',
          'Rollback beschikbaar binnen 24 uur',
        ],
        metricLabel: 'Confidence',
        metricValue: '87%',
        impactLabel: 'Impact',
        impactValue: '+€1,2k/mnd',
        linkedInsightId: 'pricing',
        executionConfirmation: "Prijsoptimalisatie gepubliceerd voor 3 SKU's",
        executeLabel: 'Automatisch uitvoeren',
        undoable: true,
        undoWindowLabel: '24 uur',
        postExecuteActions: ['undo', 'adjust', 'explain'],
      };
    case 'SUPPLIER_CHECK':
      return {
        ...base,
        intentId: intent.id,
        preparedHeadline: 'Leverancierssync kan starten',
        result: 'Nordic Components: 4 producten met inkoopdaling — sync voorbereid.',
        action: 'SYNC_SUPPLIER',
        requiresApproval: false,
        riskBand: 'low',
        summary: 'Gemiddelde inkoopdaling −6,8% — doorvoeren behoudt marge per categorie.',
        highlights: [
          '4 producten · Nordic Components',
          'Laatste sync 09:14',
          'Sync kan nu starten',
        ],
        metricLabel: 'Producten',
        metricValue: '4',
        impactLabel: 'Besparing',
        impactValue: '−6,8%',
        linkedInsightId: 'supplier',
        executionConfirmation: 'Leverancierssync gestart voor Nordic Components',
        executeLabel: 'Automatisch uitvoeren',
        undoable: true,
        undoWindowLabel: '24 uur',
        postExecuteActions: ['undo', 'adjust', 'explain'],
      };
    case 'HIGH_RISK_APPROVALS':
      return {
        ...base,
        intentId: intent.id,
        preparedHeadline: 'Jouw besluit is nodig',
        result: '4 high-risk goedkeuringen staan in de wachtrij.',
        action: 'OPEN_APPROVALS',
        requiresApproval: true,
        riskBand: 'high',
        summary: 'Bulkprijs (23 SKU) en kritieke mail-escalatie hebben hoogste prioriteit.',
        highlights: [
          'Bulkprijs · 23 SKU (hoog)',
          'Mail escalatie (kritiek)',
          '+2 meer in wachtrij',
        ],
        metricLabel: 'Open',
        metricValue: '4',
        impactLabel: 'Risico',
        impactValue: 'Hoog',
        linkedInsightId: 'approvals',
        executionConfirmation: '4 goedkeuringen verwerkt',
        executeLabel: 'Goedkeuring nodig',
        gateTitle: 'High-risk goedkeuringen verwerken',
        gateSummary:
          'AETHER voert 4 goedkeuringen uit na jouw expliciete bevestiging — bulkprijs en escalatie-mail hebben prioriteit.',
        gateImpact: '23 SKU bulkprijs + 1 kritieke mail-escalatie',
        gateRiskDetail:
          'Bulkprijs overschrijdt auto-goedkeuringsdrempel; escalatie vereist menselijke controle.',
      };
    case 'INSIGHTS_OVERVIEW':
      return {
        ...base,
        intentId: intent.id,
        preparedHeadline: 'Dit staat vandaag voor je klaar',
        result: 'Drie acties zijn voorbereid en wachten op jou.',
        action: 'SHOW_INSIGHTS',
        requiresApproval: false,
        riskBand: 'low',
        summary: 'Prijsactie, leverancierssync en goedkeuringen — in die volgorde aanbevolen.',
        highlights: ['1 prijsactie klaar', '4 producten sync gereed', '4 goedkeuringen wachten'],
        metricLabel: 'Acties',
        metricValue: '3',
        impactLabel: 'Klaar',
        impactValue: '3 acties',
        linkedInsightId: null,
        executionConfirmation: 'Overzicht bijgewerkt',
      };
    case 'MARGIN_INSIGHT':
      return {
        ...base,
        intentId: intent.id,
        result: 'Marge per categorie berekend.',
        action: 'SHOW_INSIGHTS',
        requiresApproval: false,
        riskBand: 'low',
        summary:
          'Audio ligt 4,2% onder je gemiddelde marge deze week — Elektronica en Mode presteren beter.',
        highlights: [
          'Audio · 27,2% (−4,2pp vs. gem.)',
          'Elektronica · 34,2% (hoog)',
          'Mode · 28,1% (gemiddeld)',
          '+2 categorieën',
        ],
        metricLabel: 'Gem. marge',
        metricValue: '31,4%',
        impactLabel: 'Audio',
        impactValue: '−4,2%',
        linkedInsightId: 'margins',
        executionConfirmation: 'Marge-inzicht opgeslagen in Insights',
        executeLabel: 'Open Insights',
      };
    case 'AUTONOMOUS_ACTION':
      return {
        ...base,
        intentId: intent.id,
        result: 'Autonome prijsbatch klaar om te starten.',
        action: 'APPLY_PRICE',
        requiresApproval: false,
        riskBand: 'low',
        verifiedUplift: 870,
        summary: "3 SKU's binnen low-risk band — geen goedkeuring nodig, rollback binnen 24 uur.",
        highlights: [
          "3 SKU's geselecteerd",
          'Verwachte marge +€870 / maand',
          'Policy: max +5% per SKU',
        ],
        metricLabel: "SKU's",
        metricValue: '3',
        impactLabel: 'Impact',
        impactValue: '+€870/mnd',
        linkedInsightId: 'autonomous',
        executionConfirmation: "Autonome prijsrun gestart voor 3 SKU's",
        executeLabel: 'Automatisch uitvoeren',
        undoable: true,
        undoWindowLabel: '24 uur',
        postExecuteActions: ['undo', 'adjust', 'explain'],
      };
    case 'COMPOUND_WORKFLOW':
      return buildCompoundDemoResponse(command);
    case 'RETURN_RISK_ORDERS':
      return {
        ...base,
        intentId: intent.id,
        result: '2 orders met verhoogde retourkans deze maand.',
        action: 'OPEN_ORDERS',
        requiresApproval: false,
        riskBand: 'medium',
        summary:
          'Beide orders tonen retourpatronen boven je drempel — preventieve actie aanbevolen.',
        highlights: [
          '#4821 · Audio bundle (42% retourkans)',
          '#4798 · Earbuds Pro (38% retourkans)',
        ],
        metricLabel: 'Orders',
        metricValue: '2',
        impactLabel: 'Risico',
        impactValue: 'Hoog',
        linkedInsightId: 'returns',
        executionConfirmation: 'Orders gemarkeerd voor follow-up',
        executeLabel: 'Bekijk orders',
      };
    case 'BUSINESS_SUMMARY':
      return {
        ...base,
        intentId: intent.id,
        result: 'Sterke week — omzet en marge stijgen.',
        action: 'SHOW_INSIGHTS',
        requiresApproval: false,
        riskBand: 'low',
        summary: 'Omzet +12% vs. vorige week; marge +0,8pp. Orders stabiel.',
        highlights: [
          'Omzet €48,2k (+12%)',
          '312 orders',
          'Marge 31,4% (+0,8pp)',
          'Top: Earbuds Pro',
        ],
        metricLabel: 'Omzet',
        metricValue: '€48,2k',
        impactLabel: 'Groei',
        impactValue: '+12%',
        responseVariant: 'summary',
        secondaryMetrics: [
          { label: 'Orders', value: '312' },
          { label: 'Marge', value: '31,4%' },
        ],
        linkedInsightId: 'summary',
        executionConfirmation: 'Weekoverzicht opgeslagen',
        executeLabel: 'Bekijk in Insights',
      };
    default: {
      const contextual =
        contextInput != null ? getContextualSuggestionsForUnknown(contextInput, 2) : [];
      const highlights =
        contextual.length > 0
          ? contextual.map((s) => `Probeer: "${s.label}"`)
          : ['Probeer: "Optimaliseer mijn prijzen deze week"', 'Of: "Toon marge per categorie"'];
      return {
        ...base,
        intentId: 'UNKNOWN',
        preparedHeadline: 'Meer context nodig',
        result: 'AETHER herkent dit commando nog niet als één duidelijke actie.',
        action: 'SUGGEST',
        requiresApproval: false,
        riskBand: 'low',
        confidence: 0.55,
        summary: 'Kies een suggestie hieronder — die sluit aan op wat er nu in je winkel speelt.',
        highlights,
        metricLabel: 'Tip',
        metricValue: '⌘K',
        linkedInsightId: null,
      };
    }
  }
}
export function intentLabel(id: DemoIntentId): string {
  return INTENT_LABELS[id];
}
export function intentToLinkedInsight(intentId: DemoIntentId): LinkedInsightId {
  switch (intentId) {
    case 'PRICING_OPTIMIZATION':
    case 'PRODUCT_PRICE_PROPOSAL':
    case 'COMPOUND_WORKFLOW':
      return 'pricing';
    case 'SUPPLIER_CHECK':
      return 'supplier';
    case 'HIGH_RISK_APPROVALS':
      return 'approvals';
    case 'MARGIN_INSIGHT':
      return 'margins';
    case 'AUTONOMOUS_ACTION':
      return 'autonomous';
    case 'RETURN_RISK_ORDERS':
      return 'returns';
    case 'BUSINESS_SUMMARY':
      return 'summary';
    default:
      return null;
  }
}
