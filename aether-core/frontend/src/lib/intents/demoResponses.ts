import type { CommandResult } from '@/types/command';
import type { DemoCommandResponse, DemoExplainStep, DemoIntentId, LinkedInsightId } from './types';
import type { SuggestionBuildInput } from '../commandSuggestionContext';
import { isCompoundCommand, parseCompoundCommand } from '../compoundCommandParser';
import { EXPLAIN_TIMELINES, INTENT_LABELS, LOADING_PHASES } from './metadata';
import { detectIntent } from './intentRules';
import { getContextualSuggestionsForUnknown } from './suggestionRanking';

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
