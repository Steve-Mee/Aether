import type { BrainResponseService } from '../../../../../ai/intelligence/command-brain/BrainResponseService';
import type { AgentSupervisorPort } from '../../../../../ai/intelligence/multi-agent/AgentSupervisorPort';
import type {
  RouteSource,
  SpecialistMeta,
  AgentBranchResult,
} from '../../../../../ai/intelligence/multi-agent/types';
import type { RunSpecialistExecutionInput } from './runSpecialistExecution';

export interface ParallelExecutionResult {
  handled: boolean;
  brainResponse?: Awaited<ReturnType<BrainResponseService['generateResponse']>>;
  specialistMeta?: SpecialistMeta;
  specialistAgents?: SpecialistMeta[];
  multiAgentResultsForAggregation?: AgentBranchResult[];
  multiAgentKeysForAggregation?: string[];
}

export async function runSpecialistParallel(
  agentSupervisor: AgentSupervisorPort | undefined,
  input: RunSpecialistExecutionInput,
  executionPlan: NonNullable<Awaited<ReturnType<NonNullable<AgentSupervisorPort['routePlan']>>>>,
  compoundHandled: boolean
): Promise<ParallelExecutionResult> {
  const {
    tenantId,
    actorId,
    naturalLanguage,
    parsed,
    handlerResult,
    contextSnippets,
    memoryPromptBlock,
    collectiveSnippets,
    settings,
    rootRunId,
    streamOptions,
    explainCollector,
    abortSignal,
  } = input;

  if (compoundHandled) {
    return { handled: false };
  }

  const compoundSteps = parsed.compound?.steps?.map((s) => ({
    intent: s.intent,
    command: s.command,
  }));

  if (
    agentSupervisor?.isGraphOrchestrationEnabled?.() &&
    agentSupervisor?.executeGraph
  ) {
    const graphResult = await agentSupervisor.executeGraph({
      tenantId,
      command: naturalLanguage,
      intent: parsed.intent,
      subGoals: compoundSteps,
      contextSnippets,
      agents: executionPlan.agents.map((a) => ({
        agentKey: a.agentKey,
        intent: a.intent,
        contextSnippets,
      })),
      actorId,
      collectiveSnippets,
      memoryPromptBlock: memoryPromptBlock || undefined,
      deferToTools: true,
      adaptiveLearningEnabled: settings.brainAdaptiveLearningEnabled,
      graphDefinition: executionPlan.graphDefinition,
      onEvent: streamOptions?.onEvent,
      explainabilityCollector: explainCollector,
      abortSignal,
      parentRunId: rootRunId,
    });

    if (graphResult.mode === 'parallel' && graphResult.parallelResult) {
      const parallelResult = graphResult.parallelResult;
      return {
        handled: true,
        brainResponse: {
          narrative: parallelResult.mergedNarrative || handlerResult,
          toolTrace: parallelResult.mergedToolTrace,
          pendingActions: parallelResult.pendingActions,
          agentRunId: parallelResult.agentRunIds[0] ?? rootRunId,
          checkpoint: parallelResult.checkpoint,
          runStatus: parallelResult.checkpoint ? 'awaiting_approval' : 'completed',
        },
        specialistAgents: parallelResult.results.map((r, i) => ({
          agentKey: executionPlan.agents[i]?.agentKey ?? 'admin',
          delegatedFrom: 'admin',
          specialistRunId: r.agentRunId,
          handoffSummary: r.handoffPackage?.summary,
          routingSource: 'intent' as RouteSource,
        })),
        specialistMeta: {
          agentKey: executionPlan.agents[0]?.agentKey ?? 'admin',
          delegatedFrom: 'admin',
          specialistRunId: parallelResult.results[0]?.agentRunId,
          handoffSummary: parallelResult.results[0]?.handoffPackage?.summary,
          routingSource: 'intent' as RouteSource,
        },
        multiAgentResultsForAggregation: parallelResult.results,
        multiAgentKeysForAggregation: executionPlan.agents.map((a) => a.agentKey),
      };
    }
  }

  if (
    executionPlan.mode === 'parallel' &&
    executionPlan.agents.length > 0 &&
    agentSupervisor?.executeParallel
  ) {
    const parallelResult = await agentSupervisor.executeParallel({
      tenantId,
      command: naturalLanguage,
      agents: executionPlan.agents.map((a) => ({
        agentKey: a.agentKey,
        intent: a.intent,
        contextSnippets,
      })),
      actorId,
      collectiveSnippets,
      memoryPromptBlock: memoryPromptBlock || undefined,
      deferToTools: true,
      adaptiveLearningEnabled: settings.brainAdaptiveLearningEnabled,
      onEvent: streamOptions?.onEvent,
      explainabilityCollector: explainCollector,
      abortSignal,
      parentRunId: rootRunId,
    });

    const specialistAgents = parallelResult.results.map((r, i) => ({
      agentKey: executionPlan.agents[i]?.agentKey ?? 'admin',
      delegatedFrom: 'admin',
      specialistRunId: r.agentRunId,
      handoffSummary: r.handoffPackage?.summary,
      routingSource: (executionPlan.routingSource ?? 'intent') as RouteSource,
    }));

    return {
      handled: true,
      brainResponse: {
        narrative: parallelResult.mergedNarrative || handlerResult,
        toolTrace: parallelResult.mergedToolTrace,
        pendingActions: parallelResult.pendingActions,
        agentRunId: parallelResult.agentRunIds[0] ?? rootRunId,
        checkpoint: parallelResult.checkpoint,
        runStatus: parallelResult.checkpoint ? 'awaiting_approval' : 'completed',
      },
      specialistAgents,
      specialistMeta: specialistAgents[0],
      multiAgentResultsForAggregation: parallelResult.results,
      multiAgentKeysForAggregation: executionPlan.agents.map((a) => a.agentKey),
    };
  }

  return { handled: false };
}
