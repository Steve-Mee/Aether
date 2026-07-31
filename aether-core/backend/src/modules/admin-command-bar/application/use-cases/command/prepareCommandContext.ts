import { orchestrator } from '../../../../../ai/orchestrator/Orchestrator';
import type { CommandBrainService } from '../../../../../ai/intelligence/command-brain/CommandBrainService';
import type { AgentStreamCallback } from '../../../../../ai/intelligence/command-brain/AgentStreamEvents';
import { emitStreamEvent } from '../../../../../ai/intelligence/command-brain/AgentStreamEvents';
import { ExplainabilityCollector } from '../../../../../ai/intelligence/explainability/ExplainabilityCollector';
import { setReflectionExperimentOverride } from '../../../../../ai/intelligence/personal-brain/reflection/ReflectionExperimentOverrides';
import type { PersonalBrainMemoryService } from '../../../../../ai/intelligence/personal-brain/memory/PersonalBrainMemoryService';
import type { ReflectionExperimentService } from '../../../../../ai/intelligence/personal-brain/reflection/experiments/ReflectionExperimentService';
import type { GlobalKnowledgeService } from '../../../../../ai/intelligence/global-knowledge/GlobalKnowledgeService';
import type { GlobalKnowledgeContextMeta } from '../../../../../ai/intelligence/global-knowledge/types';
import { matchIntent } from '../../services/command/matchIntent';

export interface PrepareCommandContextDeps {
  commandBrain?: CommandBrainService;
  personalBrainMemory?: PersonalBrainMemoryService;
  reflectionExperimentService?: ReflectionExperimentService;
  globalKnowledgeService?: GlobalKnowledgeService;
  goalContextProvider?: import('../../../../../ai/intelligence/goals/GoalContextProvider').GoalContextProvider;
}

export interface PrepareCommandContextInput {
  tenantId: string;
  actorId?: string;
  naturalLanguage: string;
  explainCollector: ExplainabilityCollector;
  streamOptions?: { onEvent?: AgentStreamCallback; abortSignal?: AbortSignal };
}

export interface PrepareCommandContextResult {
  contextSnippets: string[];
  recallMatches: Array<{ id: string; score: number }>;
  retrievalError?: string;
  memoryPromptBlock: string;
  memoryNotice?: string;
  reflectionNotice?: string;
  memoryRecalled: Array<{ summary: string; age: string; layer: 'short' | 'long'; kind?: string }>;
  globalKnowledgeMeta?: GlobalKnowledgeContextMeta;
  experimentVariantArm: 'control' | 'treatment';
  workflowRunId?: string;
}

export async function prepareCommandContext(
  deps: PrepareCommandContextDeps,
  input: PrepareCommandContextInput
): Promise<PrepareCommandContextResult> {
  const {
    commandBrain,
    personalBrainMemory,
    reflectionExperimentService,
    globalKnowledgeService,
    goalContextProvider,
  } = deps;

  const { tenantId, actorId, naturalLanguage, explainCollector, streamOptions } = input;

  let contextSnippets: string[] = [];
  let recallMatches: Array<{ id: string; score: number }> = [];
  let retrievalError: string | undefined;
  let memoryPromptBlock = '';
  let memoryNotice: string | undefined;
  let reflectionNotice: string | undefined;
  let memoryRecalled: Array<{ summary: string; age: string; layer: 'short' | 'long'; kind?: string }> = [];
  let globalKnowledgeMeta: GlobalKnowledgeContextMeta | undefined;
  let experimentVariantArm: 'control' | 'treatment' = 'control';
  let workflowRunId: string | undefined;

  const useOrchestratorPrepare = process.env.COMMAND_BRAIN_USE_ORCHESTRATOR === 'true';

  if (reflectionExperimentService) {
    try {
      const resolved = await reflectionExperimentService.resolveConfig(tenantId);
      experimentVariantArm = resolved.variantArm;
      setReflectionExperimentOverride(resolved.config);
    } catch {
      setReflectionExperimentOverride(null);
    }
  }

  if (globalKnowledgeService) {
    const syncResult = await globalKnowledgeService.syncForTenant(tenantId);
    globalKnowledgeMeta = globalKnowledgeService.buildContextMeta(syncResult);
    if (globalKnowledgeMeta && streamOptions?.onEvent) {
      emitStreamEvent(streamOptions.onEvent, {
        type: 'global_knowledge_synced',
        summary: globalKnowledgeMeta.message,
      });
    }
  }

  if (commandBrain) {
    if (useOrchestratorPrepare) {
      const orch = await orchestrator.execute({
        tenantId,
        actorId,
        task: 'command.brain.prepare',
        input: { command: naturalLanguage },
      });
      contextSnippets = (orch.output.contextSnippets as string[]) ?? [];
      recallMatches = (orch.output.recallMatches as Array<{ id: string; score: number }>) ?? [];
      retrievalError = orch.output.retrievalError as string | undefined;
      workflowRunId = orch.runId;
    } else {
      const prepared = await commandBrain.prepareCommand({
        tenantId,
        command: naturalLanguage,
        actorId,
      });
      contextSnippets = prepared.contextSnippets;
      recallMatches = prepared.recallMatches;
      retrievalError = prepared.retrievalError;
    }
  }

  if (contextSnippets.length > 0) {
    explainCollector.registerDataSources(
      contextSnippets.slice(0, 10).map((snippet, i) => ({
        kind: 'personal_brain' as const,
        label: `Persoonlijk brein — fragment ${i + 1}`,
        preview: snippet,
        score: recallMatches[i]?.score,
      }))
    );
  }

  if (personalBrainMemory) {
    try {
      const preliminaryIntent = matchIntent(naturalLanguage)?.intent;
      const memoryRecall = await personalBrainMemory.recallForCommand(
        tenantId,
        naturalLanguage,
        preliminaryIntent ? { intent: preliminaryIntent } : undefined
      );
      memoryPromptBlock = memoryRecall.promptBlock;
      memoryNotice = memoryRecall.userNotice;
      reflectionNotice = memoryRecall.reflectionNotice;
      memoryRecalled = memoryRecall.memoryRecalled;
      if (memoryNotice) {
        explainCollector.registerDataSources([
          { kind: 'personal_brain', label: memoryNotice },
        ]);
      }
    } catch {
      // Memory recall is best-effort
    }
  }

  if (goalContextProvider) {
    try {
      const goalsBlock = await goalContextProvider.buildActiveGoalsBlock(tenantId);
      if (goalsBlock) {
        contextSnippets = [...contextSnippets, goalsBlock];
        explainCollector.registerDataSources([
          { kind: 'merchant_memory', label: 'Actieve merchant-doelen', preview: goalsBlock },
        ]);
      }
    } catch {
      // Goal context is best-effort
    }
  }

  return {
    contextSnippets,
    recallMatches,
    retrievalError,
    memoryPromptBlock,
    memoryNotice,
    reflectionNotice,
    memoryRecalled,
    globalKnowledgeMeta,
    experimentVariantArm,
    workflowRunId,
  };
}
