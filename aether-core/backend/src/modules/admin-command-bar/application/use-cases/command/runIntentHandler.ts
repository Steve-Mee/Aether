import {
  isMutatingIntent,
  shouldDeferToTools,
} from '../../../../../ai/intelligence/command-brain/BrainActionPolicyResolver';
import type { BrainAdaptiveLearningService } from '../../../../../ai/intelligence/command-brain/BrainAdaptiveLearningService';
import type { MerchantKnowledgeIndexer } from '../../../../../ai/intelligence/merchant-knowledge/MerchantKnowledgeIndexer';
import { getMerchantSettings } from '../../../../../shared/settings/TenantSettingsService';
import type { IntentHandlerDeps } from '../../intents/types';
import { ALL_INTENT_HANDLERS } from '../../intents/handlers';
import { toolForIntent } from '../../services/command/toolForIntent';

export interface RunIntentHandlerDeps {
  handlerMap: Map<string, (typeof ALL_INTENT_HANDLERS)[0]>;
  intentDeps: IntentHandlerDeps;
  adaptiveLearning?: BrainAdaptiveLearningService;
  merchantKnowledgeIndexer?: MerchantKnowledgeIndexer;
}

export interface RunIntentHandlerInput {
  tenantId: string;
  actorId?: string;
  naturalLanguage: string;
  parsed: {
    intent: string;
    confidence: number;
    parameters?: Record<string, unknown>;
    compound?: { steps: unknown[] };
  };
  specialistWillHandle: boolean;
  multiAgentPlan: boolean;
  multiAgentParallel: boolean;
  routePlan: { agents: Array<{ agentKey: string }> } | null;
  specialistDef: { agentKey: string } | null;
}

export async function runIntentHandler(deps: RunIntentHandlerDeps, input: RunIntentHandlerInput) {
  const {
    tenantId,
    actorId,
    naturalLanguage,
    parsed,
    specialistWillHandle,
    multiAgentPlan,
    multiAgentParallel,
    routePlan,
    specialistDef,
  } = input;

  let handlerResult = '';
  let operationalMeta: Record<string, unknown> | undefined;
  const handler = deps.handlerMap.get(parsed.intent);

  const settings = await getMerchantSettings(tenantId);
  let learnedHint = null;
  if (settings.brainAdaptiveLearningEnabled && settings.brainActionMode === 'adaptive' && deps.adaptiveLearning) {
    learnedHint = await deps.adaptiveLearning.getLearnedPreference(tenantId, toolForIntent(parsed.intent));
  }
  const deferToTools =
    parsed.intent === 'COMPOUND_WORKFLOW'
      ? true
      : shouldDeferToTools({
          settings,
          intent: parsed.intent,
          confidence: parsed.confidence,
          learnedHint,
        });

  if (parsed.intent === 'COMPOUND_WORKFLOW') {
    const stepCount = parsed.compound?.steps.length ?? 0;
    handlerResult = `Compound workflow: ${stepCount} sub-stappen gedetecteerd — agent plant en voert uit.`;
  } else if (specialistWillHandle && multiAgentPlan) {
    const label =
      multiAgentParallel
        ? routePlan!.agents.map((a) => a.agentKey).join(' + ')
        : routePlan!.agents.map((a) => a.agentKey).join(' → ');
    handlerResult = `Multi-agent workflow: ${label}.`;
  } else if (specialistWillHandle) {
    handlerResult = `Specialist ${specialistDef!.agentKey} handles ${parsed.intent}.`;
  } else if (handler && !(deferToTools && isMutatingIntent(parsed.intent))) {
    const outcome = await handler.execute(
      naturalLanguage,
      parsed.parameters as Record<string, unknown> | undefined,
      { tenantId, actorId },
      deps.intentDeps
    );
    handlerResult = outcome.result;
    operationalMeta = outcome.operationalMeta;
  } else if (handler && deferToTools && isMutatingIntent(parsed.intent)) {
    handlerResult = `Actie "${parsed.intent}" klaargezet — bevestig het voorstel van het brein om uit te voeren.`;
  } else if (!handler) {
    handlerResult = `Command understood as ${parsed.intent}. No destructive action taken.`;
  }

  if (parsed.intent === 'PRICE_UPDATE' && deps.merchantKnowledgeIndexer && !deferToTools) {
    deps.merchantKnowledgeIndexer.invalidate(tenantId);
  }

  return { handlerResult, operationalMeta, deferToTools, settings };
}
