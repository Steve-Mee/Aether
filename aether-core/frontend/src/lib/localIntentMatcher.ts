import type { CommandResult } from './CommandContext';

export type DemoIntentId =
  | 'PRICING_OPTIMIZATION'
  | 'SUPPLIER_CHECK'
  | 'HIGH_RISK_APPROVALS'
  | 'INSIGHTS_OVERVIEW'
  | 'UNKNOWN';

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
}

export interface DemoCommandResponse extends CommandResult {
  intentId: DemoIntentId;
  summary: string;
  highlights: string[];
  metricLabel?: string;
  metricValue?: string;
}

export const DEMO_SUGGESTIONS: DemoSuggestion[] = [
  {
    id: 'pricing-week',
    label: 'Optimaliseer prijzen deze week',
    command: 'Optimaliseer mijn prijzen deze week',
    intentId: 'PRICING_OPTIMIZATION',
  },
  {
    id: 'supplier-drops',
    label: 'Check leveranciers op prijsdalingen',
    command: 'Check leveranciers op prijsdalingen',
    intentId: 'SUPPLIER_CHECK',
  },
  {
    id: 'high-risk',
    label: 'Toon high-risk goedkeuringen',
    command: 'Toon high-risk goedkeuringen',
    intentId: 'HIGH_RISK_APPROVALS',
  },
  {
    id: 'insights-today',
    label: 'Wat staat vandaag klaar?',
    command: 'Wat staat vandaag klaar voor mij?',
    intentId: 'INSIGHTS_OVERVIEW',
  },
  {
    id: 'margin-scan',
    label: 'Scan lage marge producten',
    command: 'Toon producten met lage marge',
    intentId: 'PRICING_OPTIMIZATION',
  },
];

const INTENT_LABELS: Record<DemoIntentId, string> = {
  PRICING_OPTIMIZATION: 'Prijsoptimalisatie',
  SUPPLIER_CHECK: 'Leveranciers',
  HIGH_RISK_APPROVALS: 'Goedkeuringen',
  INSIGHTS_OVERVIEW: 'Inzichten',
  UNKNOWN: 'Algemeen',
};

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

export function detectIntent(input: string): DemoIntentMatch {
  const t = normalize(input);
  if (!t) {
    return { id: 'UNKNOWN', label: INTENT_LABELS.UNKNOWN, confidence: 0 };
  }

  const rules: Array<{ id: DemoIntentId; patterns: RegExp[]; base: number }> = [
    {
      id: 'HIGH_RISK_APPROVALS',
      patterns: [/goedkeur/, /approval/, /high.?risk/, /wacht.*besl/, /urgent/],
      base: 0.88,
    },
    {
      id: 'SUPPLIER_CHECK',
      patterns: [/leverancier/, /supplier/, /inkoop/, /prijsdaling/, /sync/, /nordic/],
      base: 0.86,
    },
    {
      id: 'PRICING_OPTIMIZATION',
      patterns: [/prijs/, /optimalis/, /margin/, /marge/, /verhoog/, /verlaag/, /earbuds/],
      base: 0.87,
    },
    {
      id: 'INSIGHTS_OVERVIEW',
      patterns: [/inzicht/, /insight/, /vandaag/, /overzicht/, /klaar/, /status/],
      base: 0.84,
    },
  ];

  for (const rule of rules) {
    const hits = rule.patterns.filter((p) => p.test(t)).length;
    if (hits > 0) {
      const confidence = Math.min(0.97, rule.base + hits * 0.03);
      return {
        id: rule.id,
        label: INTENT_LABELS[rule.id],
        confidence,
      };
    }
  }

  return { id: 'UNKNOWN', label: INTENT_LABELS.UNKNOWN, confidence: 0.62 };
}

export function filterSuggestions(input: string, limit = 5): DemoSuggestion[] {
  const t = normalize(input);
  if (!t) return DEMO_SUGGESTIONS.slice(0, limit);

  const scored = DEMO_SUGGESTIONS.map((s) => {
    const hay = `${s.label} ${s.command}`.toLowerCase();
    const tokens = t.split(/\s+/).filter(Boolean);
    const score = tokens.reduce((acc, tok) => (hay.includes(tok) ? acc + 1 : acc), 0);
    const intent = detectIntent(input);
    const intentBoost = s.intentId === intent.id ? 2 : 0;
    return { s, score: score + intentBoost };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.s);
}

export function buildDemoResponse(command: string, intentOverride?: DemoIntentId): DemoCommandResponse {
  const intent = intentOverride
    ? { id: intentOverride, label: INTENT_LABELS[intentOverride], confidence: 0.9 }
    : detectIntent(command);

  const base = {
    success: true,
    originalCommand: command,
    parsedIntent: intent.id,
    confidence: intent.confidence,
    timestamp: new Date().toISOString(),
  };

  switch (intent.id) {
    case 'PRICING_OPTIMIZATION':
      return {
        ...base,
        intentId: intent.id,
        result: 'Prijsoptimalisatie klaar om te publiceren.',
        action: 'APPLY_PRICE',
        requiresApproval: false,
        riskBand: 'low',
        verifiedUplift: 1240,
        summary: 'AETHER heeft 3 SKU’s geanalyseerd. Earbuds Pro kan veilig +4,2%.',
        highlights: ['Confidence 87%', 'Verwachte marge +€1.240 / maand', 'Rollback beschikbaar binnen 24 uur'],
        metricLabel: 'Confidence',
        metricValue: '87%',
      };
    case 'SUPPLIER_CHECK':
      return {
        ...base,
        intentId: intent.id,
        result: 'Leverancierssync voorbereid.',
        action: 'SYNC_SUPPLIER',
        requiresApproval: false,
        riskBand: 'low',
        summary: 'Nordic Components BV toont inkoop −6,8% op 12 top-SKU’s.',
        highlights: ['Laatste sync 09:14', 'Marge behouden of doorgeven per categorie', 'Sync kan nu starten'],
        metricLabel: 'SKUs',
        metricValue: '12',
      };
    case 'HIGH_RISK_APPROVALS':
      return {
        ...base,
        intentId: intent.id,
        result: '4 high-risk goedkeuringen wachten op jou.',
        action: 'OPEN_APPROVALS',
        requiresApproval: true,
        riskBand: 'high',
        summary: 'Bulkprijs en escalatie-mail hebben prioriteit.',
        highlights: ['Bulkprijs · 23 SKU (hoog)', 'Mail escalatie (kritiek)', '+2 meer in wachtrij'],
        metricLabel: 'Open',
        metricValue: '4',
      };
    case 'INSIGHTS_OVERVIEW':
      return {
        ...base,
        intentId: intent.id,
        result: 'Vandaag staan drie acties klaar.',
        action: 'SHOW_INSIGHTS',
        requiresApproval: false,
        riskBand: 'low',
        summary: 'Prijs, leverancier en goedkeuringen zijn voorbereid.',
        highlights: ['1 prijsactie klaar', '12 SKU sync gereed', '4 goedkeuringen wachten'],
        metricLabel: 'Acties',
        metricValue: '3',
      };
    default:
      return {
        ...base,
        intentId: 'UNKNOWN',
        result: 'AETHER begrijpt je intentie nog niet volledig.',
        action: 'SUGGEST',
        requiresApproval: false,
        riskBand: 'low',
        confidence: 0.55,
        summary: 'Kies een suggestie of verfijn je commando.',
        highlights: [
          'Probeer: “Optimaliseer mijn prijzen deze week”',
          'Of: “Toon high-risk goedkeuringen”',
        ],
        metricLabel: 'Tip',
        metricValue: '⌘K',
      };
  }
}

export function intentLabel(id: DemoIntentId): string {
  return INTENT_LABELS[id];
}
