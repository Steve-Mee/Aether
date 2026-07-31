import type { BrainResponseService } from '../../../../../ai/intelligence/command-brain/BrainResponseService';
import { isMutatingIntent } from '../../../../../ai/intelligence/command-brain/BrainActionPolicyResolver';
import type { AgentSupervisorPort } from '../../../../../ai/intelligence/multi-agent/AgentSupervisorPort';
import type { RouteSource, SpecialistMeta } from '../../../../../ai/intelligence/multi-agent/types';
import type { RunSpecialistExecutionInput } from './runSpecialistExecution';

export interface SingleExecutionResult {
  brainResponse: Awaited<ReturnType<BrainResponseService['generateResponse']>>;
  specialistMeta?: SpecialistMeta;
}

export async function runSpecialistSingle(
  agentSupervisor: AgentSupervisorPort | undefined,
  brainResponseService: BrainResponseService,
  input: RunSpecialistExecutionInput
): Promise<SingleExecutionResult> {
  const {
    tenantId,
    actorId,
    naturalLanguage,
    parsed,
    handlerResult,
    contextSnippets,
    memoryPromptBlock,
    collectiveSnippets,
    deferToTools,
    settings,
    routePlan,
    routeDecision,
    specialistDef,
    proactiveAgentKey,
    proactiveIntentId,
    rootRunId,
    streamOptions,
    explainCollector,
    abortSignal,
  } = input;

  if ((specialistDef || proactiveAgentKey) && agentSupervisor?.executeSpecialist) {
    const primaryAgentKey = proactiveAgentKey ?? specialistDef!.agentKey;
    const specialistResult = await agentSupervisor.executeSpecialist({
      tenantId,
      agentKey: primaryAgentKey as 'admin',
      intent: proactiveIntentId ?? parsed.intent,
      command: naturalLanguage,
      contextSnippets,
      handlerResult,
      parameters: (parsed.parameters as Record<string, unknown>) ?? {},
      actorId,
      collectiveSnippets,
      memoryPromptBlock: memoryPromptBlock || undefined,
      deferToTools: deferToTools || isMutatingIntent(parsed.intent),
      adaptiveLearningEnabled: settings.brainAdaptiveLearningEnabled,
      onEvent: streamOptions?.onEvent,
      explainabilityCollector: explainCollector,
      abortSignal,
      parentRunId: rootRunId,
    });

    return {
      brainResponse: {
        narrative: specialistResult.narrative || handlerResult,
        actionProposal: specialistResult.actionProposal,
        error: specialistResult.error,
        toolTrace: specialistResult.toolTrace,
        pendingActions: specialistResult.pendingActions,
        agentRunId: specialistResult.agentRunId,
        checkpoint: specialistResult.checkpoint,
        awaitingApprovalId: specialistResult.awaitingApprovalId,
        runStatus: specialistResult.runStatus,
        plan: specialistResult.plan,
        summary: specialistResult.summary,
      },
      specialistMeta: {
        agentKey: primaryAgentKey,
        delegatedFrom: 'admin',
        specialistRunId: specialistResult.agentRunId,
        handoffSummary: specialistResult.handoffPackage?.summary,
        routingSource: (routePlan?.routingSource ?? routeDecision?.source) as RouteSource | undefined,
      },
    };
  }

  const brainResponse = await brainResponseService.generateResponse(
    {
      tenantId,
      command: naturalLanguage,
      parsedIntent: parsed.intent,
      parameters: (parsed.parameters as Record<string, unknown>) ?? {},
      contextSnippets,
      handlerResult,
      memoryPromptBlock: memoryPromptBlock || undefined,
    },
    {
      deferToTools,
      adaptiveLearningEnabled: settings.brainAdaptiveLearningEnabled,
      actorId,
      collectiveSnippets,
      onEvent: streamOptions?.onEvent,
      explainabilityCollector: explainCollector,
      abortSignal,
      subGoals: parsed.compound?.steps,
    }
  );

  return { brainResponse };
}
