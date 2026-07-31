import type { BrainResponseService } from '../../../../../ai/intelligence/command-brain/BrainResponseService';
import { isSupervisorModeEnabled } from '../../../../../ai/intelligence/multi-agent/supervisorConfig';
import { WORKFLOW_SUPERVISOR_KEY } from '../../../../../ai/intelligence/multi-agent/agents/WorkflowSupervisorAgent';
import type { AgentSupervisorPort } from '../../../../../ai/intelligence/multi-agent/AgentSupervisorPort';
import type {
  RouteSource,
  SpecialistMeta,
  SpecialistExecuteResult,
} from '../../../../../ai/intelligence/multi-agent/types';
import type { RunSpecialistExecutionInput } from './runSpecialistExecution';

export interface SequentialExecutionResult {
  handled: boolean;
  brainResponse?: Awaited<ReturnType<BrainResponseService['generateResponse']>>;
  specialistMeta?: SpecialistMeta;
  specialistAgents?: SpecialistMeta[];
  multiAgentResultsForAggregation?: SpecialistExecuteResult[];
  multiAgentKeysForAggregation?: string[];
}

export async function runSpecialistSequential(
  agentSupervisor: AgentSupervisorPort | undefined,
  input: RunSpecialistExecutionInput,
  executionPlan: NonNullable<Awaited<ReturnType<NonNullable<AgentSupervisorPort['routePlan']>>>> | null,
  compoundHandled: boolean
): Promise<SequentialExecutionResult> {
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
    delegationEnabled,
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

  const useSupervisorLead =
    parsed.intent === 'COMPOUND_WORKFLOW' &&
    isSupervisorModeEnabled() &&
    delegationEnabled &&
    Boolean(agentSupervisor?.executeSpecialist);

  if (useSupervisorLead && agentSupervisor?.executeSpecialist) {
    const supervisorResult = await agentSupervisor.executeSpecialist({
      tenantId,
      agentKey: WORKFLOW_SUPERVISOR_KEY,
      intent: 'PLAN_AND_DELEGATE',
      command: naturalLanguage,
      contextSnippets,
      handlerResult,
      parameters: (parsed.parameters as Record<string, unknown>) ?? {},
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

    return {
      handled: true,
      brainResponse: {
        narrative: supervisorResult.narrative || handlerResult,
        actionProposal: supervisorResult.actionProposal,
        error: supervisorResult.error,
        toolTrace: supervisorResult.toolTrace,
        pendingActions: supervisorResult.pendingActions,
        agentRunId: supervisorResult.agentRunId ?? rootRunId,
        checkpoint: supervisorResult.checkpoint,
        awaitingApprovalId: supervisorResult.awaitingApprovalId,
        runStatus: supervisorResult.runStatus,
        plan: supervisorResult.plan,
        summary: supervisorResult.summary,
      },
      specialistMeta: {
        agentKey: WORKFLOW_SUPERVISOR_KEY,
        delegatedFrom: 'admin',
        specialistRunId: supervisorResult.agentRunId,
        handoffSummary: supervisorResult.handoffPackage?.summary,
        routingSource: 'intent' as RouteSource,
      },
    };
  }

  if (
    executionPlan &&
    executionPlan.agents.length > 0 &&
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

    if (graphResult.sequentialResults?.length) {
      const seqResults = graphResult.sequentialResults;
      const last = seqResults[seqResults.length - 1];
      const specialistAgents = seqResults.map((r, i) => ({
        agentKey: executionPlan.agents[i]?.agentKey ?? 'admin',
        delegatedFrom: 'admin',
        specialistRunId: r.agentRunId,
        handoffSummary: r.handoffPackage?.summary,
        routingSource: 'intent' as RouteSource,
      }));

      return {
        handled: true,
        brainResponse: {
          narrative: graphResult.mergedNarrative || handlerResult,
          toolTrace: seqResults.flatMap((r) => r.toolTrace ?? []),
          pendingActions: seqResults.flatMap((r) => r.pendingActions ?? []),
          agentRunId: last?.agentRunId ?? rootRunId,
          checkpoint: seqResults.some((r) => r.checkpoint),
          runStatus: seqResults.some((r) => r.checkpoint) ? 'awaiting_approval' : 'completed',
          plan: last?.plan,
          summary: last?.summary,
        },
        specialistAgents,
        specialistMeta: specialistAgents[specialistAgents.length - 1],
        multiAgentResultsForAggregation: seqResults,
        multiAgentKeysForAggregation: executionPlan.agents.map((a) => a.agentKey),
      };
    }
  }

  if (
    executionPlan &&
    executionPlan.mode === 'sequential' &&
    executionPlan.agents.length > 0 &&
    agentSupervisor?.executeSequential
  ) {
    const seqResults = await agentSupervisor.executeSequential(
      executionPlan.agents.map((a) => ({
        tenantId,
        agentKey: a.agentKey,
        intent: a.intent,
        command: a.command ?? naturalLanguage,
        contextSnippets,
        handlerResult: `Sequential sub-task: ${a.intent}`,
        actorId,
        collectiveSnippets,
        memoryPromptBlock: memoryPromptBlock || undefined,
        deferToTools: true,
        adaptiveLearningEnabled: settings.brainAdaptiveLearningEnabled,
        onEvent: streamOptions?.onEvent,
        explainabilityCollector: explainCollector,
        abortSignal,
        parentRunId: rootRunId,
      }))
    );

    const last = seqResults[seqResults.length - 1];
    const specialistAgents = seqResults.map((r, i) => ({
      agentKey: executionPlan.agents[i]?.agentKey ?? 'admin',
      delegatedFrom: i === 0 ? 'admin' : (executionPlan.agents[i - 1]?.agentKey ?? 'admin'),
      specialistRunId: r.agentRunId,
      handoffSummary: r.handoffPackage?.summary,
      routingSource: (executionPlan.routingSource ?? 'intent') as RouteSource,
    }));

    return {
      handled: true,
      brainResponse: {
        narrative: seqResults.map((r) => r.narrative).filter(Boolean).join('\n\n') || handlerResult,
        toolTrace: seqResults.flatMap((r) => r.toolTrace ?? []),
        pendingActions: seqResults.flatMap((r) => r.pendingActions ?? []),
        agentRunId: last?.agentRunId ?? rootRunId,
        checkpoint: seqResults.some((r) => r.checkpoint),
        runStatus: seqResults.some((r) => r.checkpoint) ? 'awaiting_approval' : 'completed',
        plan: last?.plan,
        summary: last?.summary,
      },
      specialistAgents,
      specialistMeta: specialistAgents[specialistAgents.length - 1],
      multiAgentResultsForAggregation: seqResults,
      multiAgentKeysForAggregation: executionPlan.agents.map((a) => a.agentKey),
    };
  }

  return { handled: false };
}
