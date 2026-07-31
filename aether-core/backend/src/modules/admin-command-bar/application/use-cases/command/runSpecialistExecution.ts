import type { BrainResponseService } from '../../../../../ai/intelligence/command-brain/BrainResponseService';
import type { AgentStreamCallback } from '../../../../../ai/intelligence/command-brain/AgentStreamEvents';
import { ExplainabilityCollector } from '../../../../../ai/intelligence/explainability/ExplainabilityCollector';
import { isSupervisorModeEnabled } from '../../../../../ai/intelligence/multi-agent/supervisorConfig';
import type { AgentSupervisorPort } from '../../../../../ai/intelligence/multi-agent/AgentSupervisorPort';
import type {
  SpecialistMeta,
  AgentContribution,
  ActionConflict,
  SynthesisSource,
} from '../../../../../ai/intelligence/multi-agent/types';
import type { AgentMessage } from '../../../../../ai/intelligence/command-brain/AgentTranscript';
import type { MultiAgentResultAggregator } from '../../../../../ai/intelligence/multi-agent/MultiAgentResultAggregator';
import type { RunMemoryPromoter } from '../../../../../ai/intelligence/multi-agent/memory/RunMemoryPromoter';
import { collectAgentTranscripts } from './collectAgentTranscripts';
import type { ParsedCommand } from '../../../../../ai/intelligence/agent-runtime/types';
import type { MerchantSettings } from '../../../../../shared/settings/merchantSettingsTypes';
import { runSpecialistSequential } from './runSpecialistSequential';
import { runSpecialistParallel } from './runSpecialistParallel';
import { runSpecialistSingle } from './runSpecialistSingle';

export interface RunSpecialistExecutionDeps {
  agentSupervisor?: AgentSupervisorPort;
  brainResponse: BrainResponseService;
  multiAgentResultAggregator?: MultiAgentResultAggregator;
  runMemoryPromoter?: RunMemoryPromoter;
}

export interface RunSpecialistExecutionInput {
  tenantId: string;
  actorId?: string;
  naturalLanguage: string;
  parsed: ParsedCommand;
  handlerResult: string;
  contextSnippets: string[];
  memoryPromptBlock: string;
  collectiveSnippets: string[];
  deferToTools: boolean;
  settings: MerchantSettings;
  delegationEnabled: boolean;
  multiAgentPlan: boolean | null;
  routePlan: Awaited<ReturnType<NonNullable<AgentSupervisorPort['routePlan']>>> | null;
  routeDecision: Awaited<ReturnType<NonNullable<AgentSupervisorPort['routeDecision']>>> | null;
  specialistDef: Awaited<ReturnType<NonNullable<AgentSupervisorPort['route']>>> | null;
  proactiveAgentKey?: string;
  proactiveIntentId?: string;
  rootRunId?: string;
  streamOptions?: { onEvent?: AgentStreamCallback; abortSignal?: AbortSignal };
  explainCollector: ExplainabilityCollector;
  abortSignal?: AbortSignal;
}

export interface RunSpecialistExecutionResult {
  brainResponse: Awaited<ReturnType<BrainResponseService['generateResponse']>>;
  specialistMeta?: SpecialistMeta;
  specialistAgents?: SpecialistMeta[];
  executionMode?: 'single' | 'sequential' | 'parallel';
  agentContributions?: AgentContribution[];
  actionConflicts?: ActionConflict[];
  synthesisSource?: SynthesisSource;
  sharedMemorySummary?: Record<string, unknown>;
  agentTranscripts?: Record<string, AgentMessage[]>;
}

export async function runSpecialistExecution(
  deps: RunSpecialistExecutionDeps,
  input: RunSpecialistExecutionInput
): Promise<RunSpecialistExecutionResult> {
  const {
    agentSupervisor,
    brainResponse: brainResponseService,
    multiAgentResultAggregator,
    runMemoryPromoter,
  } = deps;

  const {
    tenantId,
    naturalLanguage,
    parsed,
    handlerResult,
    delegationEnabled,
    multiAgentPlan,
    routePlan,
    rootRunId,
    settings,
  } = input;

  const compoundSteps = parsed.compound?.steps?.map((s) => ({
    intent: s.intent,
    command: s.command,
  }));

  const useSupervisorLead =
    parsed.intent === 'COMPOUND_WORKFLOW' &&
    isSupervisorModeEnabled() &&
    delegationEnabled &&
    Boolean(agentSupervisor?.executeSpecialist);

  const executionPlan =
    useSupervisorLead
      ? null
      : parsed.intent === 'COMPOUND_WORKFLOW' && delegationEnabled && agentSupervisor?.resolveExecutionPlan
        ? agentSupervisor.resolveExecutionPlan(
            naturalLanguage,
            parsed.intent,
            compoundSteps,
            parsed.compound?.connector ?? 'sequential'
          )
        : multiAgentPlan && routePlan
          ? routePlan
          : null;

  let compoundHandled = false;
  let executionMode: 'single' | 'sequential' | 'parallel' | undefined;
  let brainResponse: Awaited<ReturnType<BrainResponseService['generateResponse']>>;
  let specialistMeta: SpecialistMeta | undefined;
  let specialistAgents: SpecialistMeta[] | undefined;
  let multiAgentResultsForAggregation:
    | import('../../../../../ai/intelligence/multi-agent/types').AgentBranchResult[]
    | import('../../../../../ai/intelligence/multi-agent/types').SpecialistExecuteResult[]
    | undefined;
  let multiAgentKeysForAggregation: string[] | undefined;

  const sequentialResult = await runSpecialistSequential(
    agentSupervisor,
    input,
    executionPlan,
    compoundHandled
  );
  if (sequentialResult.handled) {
    compoundHandled = true;
    executionMode = 'sequential';
    brainResponse = sequentialResult.brainResponse!;
    specialistMeta = sequentialResult.specialistMeta;
    specialistAgents = sequentialResult.specialistAgents;
    multiAgentResultsForAggregation = sequentialResult.multiAgentResultsForAggregation;
    multiAgentKeysForAggregation = sequentialResult.multiAgentKeysForAggregation;
  }

  if (!compoundHandled && executionPlan && executionPlan.agents.length > 0) {
    const parallelResult = await runSpecialistParallel(
      agentSupervisor,
      input,
      executionPlan,
      compoundHandled
    );
    if (parallelResult.handled) {
      compoundHandled = true;
      executionMode = 'parallel';
      brainResponse = parallelResult.brainResponse!;
      specialistMeta = parallelResult.specialistMeta;
      specialistAgents = parallelResult.specialistAgents;
      multiAgentResultsForAggregation = parallelResult.multiAgentResultsForAggregation;
      multiAgentKeysForAggregation = parallelResult.multiAgentKeysForAggregation;
    }
  }

  if (!compoundHandled) {
    executionMode = 'single';
    const singleResult = await runSpecialistSingle(agentSupervisor, brainResponseService, input);
    brainResponse = singleResult.brainResponse;
    specialistMeta = singleResult.specialistMeta;
  }

  let agentContributions: AgentContribution[] | undefined;
  let actionConflicts: ActionConflict[] | undefined;
  let synthesisSource: SynthesisSource | undefined;
  let sharedMemorySummary: Record<string, unknown> | undefined;
  let agentTranscripts: Record<string, AgentMessage[]> | undefined;

  if (
    multiAgentResultAggregator &&
    multiAgentResultsForAggregation &&
    multiAgentKeysForAggregation &&
    multiAgentKeysForAggregation.length > 1
  ) {
    const aggregated = await multiAgentResultAggregator.aggregate({
      command: naturalLanguage,
      results: multiAgentResultsForAggregation,
      agentKeys: multiAgentKeysForAggregation,
      fallbackNarrative: brainResponse!.narrative,
      tenantId,
      runId: rootRunId,
      autonomyPrefs: settings.autonomyPrefs,
    });
    brainResponse = { ...brainResponse!, narrative: aggregated.narrative };
    agentContributions = aggregated.perAgentContributions;
    actionConflicts = aggregated.conflicts;
    synthesisSource = aggregated.synthesisSource;
    sharedMemorySummary = aggregated.sharedMemorySummary;
  }

  if (
    runMemoryPromoter &&
    rootRunId &&
    multiAgentKeysForAggregation &&
    multiAgentKeysForAggregation.length > 1
  ) {
    try {
      await runMemoryPromoter.promoteRunToMerchant(tenantId, rootRunId);
    } catch {
      // Promotion is best-effort
    }
  }

  if (multiAgentResultsForAggregation && multiAgentKeysForAggregation) {
    agentTranscripts = collectAgentTranscripts(
      multiAgentResultsForAggregation,
      multiAgentKeysForAggregation
    );
  }

  return {
    brainResponse: brainResponse!,
    specialistMeta,
    specialistAgents,
    executionMode,
    agentContributions,
    actionConflicts,
    synthesisSource,
    sharedMemorySummary,
    agentTranscripts,
  };
}
