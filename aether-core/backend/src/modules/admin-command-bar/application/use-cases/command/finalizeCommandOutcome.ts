import type { CommandLogPort } from '../../ports/CommandLogPort';
import { writeAuditLog } from '../../../../../shared/audit/auditService';
import { orchestrator } from '../../../../../ai/orchestrator/Orchestrator';
import { workflowEngine } from '../../../../../ai/orchestrator/WorkflowEngine';
import { computeIncrementalRevenueUplift } from '../../../../../ai/attribution/OutcomeEngine';
import { isMutatingIntent } from '../../../../../ai/intelligence/command-brain/BrainActionPolicyResolver';
import { linkProposalsToCommand } from '../../../../../ai/intelligence/personal-brain/tools/BrainToolProposalStore';
import { updateBrainAgentRunCommandId } from '../../../../../ai/intelligence/command-brain/BrainAgentRunStore';
import type { BrainResponseService } from '../../../../../ai/intelligence/command-brain/BrainResponseService';
import type { PersonalBrainRegistry } from '../../../../../ai/intelligence/personal-brain/PersonalBrainRegistry';
import type { PersonalBrainMemoryService } from '../../../../../ai/intelligence/personal-brain/memory/PersonalBrainMemoryService';
import type { GlobalKnowledgeService } from '../../../../../ai/intelligence/global-knowledge/GlobalKnowledgeService';
import type { GlobalKnowledgeContextMeta } from '../../../../../ai/intelligence/global-knowledge/types';
import { ExplainabilityCollector } from '../../../../../ai/intelligence/explainability/ExplainabilityCollector';
import { persistCommandExplainability } from '../../../../../shared/explain/ExplainabilityService';
import type {
  AgentContribution,
  SpecialistMeta,
} from '../../../../../ai/intelligence/multi-agent/types';
import type { ToolProposal } from '../../../../../ai/intelligence/personal-brain/tools/types';
import { SuggestionService } from '../../services/SuggestionService';
import { deriveRiskFromProposals } from '../../services/command/deriveRiskFromProposals';

export interface FinalizeCommandOutcomeDeps {
  commandLog: CommandLogPort;
  personalBrainMemory?: PersonalBrainMemoryService;
  personalBrainRegistry: PersonalBrainRegistry;
  globalKnowledgeService?: GlobalKnowledgeService;
}

export interface FinalizeCommandOutcomeInput {
  tenantId: string;
  actorId?: string;
  naturalLanguage: string;
  parsed: { intent: string; action: string | null; confidence: number };
  handlerResult: string;
  operationalMeta?: Record<string, unknown>;
  deferToTools: boolean;
  brainResponse: Awaited<ReturnType<BrainResponseService['generateResponse']>>;
  specialistMeta?: SpecialistMeta;
  specialistAgents?: Array<{ agentKey: string }>;
  specialistDef?: { agentKey: string } | null;
  executionMode?: 'single' | 'sequential' | 'parallel';
  agentContributions?: AgentContribution[];
  actionConflicts?: unknown;
  synthesisSource?: unknown;
  sharedMemorySummary?: unknown;
  agentTranscripts?: unknown;
  pendingActions: ToolProposal[];
  autoExecuted: Array<{ proposalId: string; result: string }>;
  earlyCommandId?: string;
  rootRunId?: string;
  workflowRunId?: string;
  contextSnippets: string[];
  recallMatches: Array<{ id: string; score: number }>;
  retrievalError?: string;
  collectiveSnippetCount: number;
  globalKnowledgeMeta?: GlobalKnowledgeContextMeta;
  knowledgeContributionNotice?: string;
  memoryNotice?: string;
  reflectionNotice?: string;
  reflectionStored?: string;
  memoryRecalled: Array<{ summary: string; age: string; layer: 'short' | 'long'; kind?: string }>;
  explainCollector: ExplainabilityCollector;
  agentResultActionProposal?: unknown;
}

export async function finalizeCommandOutcome(
  deps: FinalizeCommandOutcomeDeps,
  input: FinalizeCommandOutcomeInput
) {
  const {
    tenantId,
    actorId,
    naturalLanguage,
    parsed,
    handlerResult,
    operationalMeta,
    deferToTools,
    brainResponse,
    specialistMeta,
    specialistAgents,
    specialistDef,
    executionMode,
    agentContributions,
    actionConflicts,
    synthesisSource,
    sharedMemorySummary,
    agentTranscripts,
    pendingActions,
    autoExecuted,
    earlyCommandId,
    rootRunId,
    workflowRunId,
    contextSnippets,
    recallMatches,
    retrievalError,
    collectiveSnippetCount,
    globalKnowledgeMeta,
    knowledgeContributionNotice,
    memoryNotice,
    reflectionNotice,
    reflectionStored,
    memoryRecalled,
    explainCollector,
    agentResultActionProposal,
  } = input;

  const result = brainResponse.narrative || handlerResult;
  const uplift = await computeIncrementalRevenueUplift(tenantId);
  const { riskBand, requiresApproval } = deriveRiskFromProposals(pendingActions);
  const handlerExecuted = !(deferToTools && isMutatingIntent(parsed.intent));
  const undoable = handlerExecuted && SuggestionService.isUndoableIntent(parsed.intent);

  const saved = earlyCommandId
    ? await deps.commandLog.updateResult(earlyCommandId, {
        result,
        intent: parsed.intent,
        confidence: parsed.confidence,
      })
    : await deps.commandLog.save(
        {
          tenantId,
          command: naturalLanguage,
          intent: parsed.intent,
          result,
          confidence: parsed.confidence,
          actor: actorId,
          operationalMeta,
        },
        undoable
          ? {
              undoable: true,
              undoExpiresAt: SuggestionService.undoExpiresAtFromNow(),
            }
          : undefined
      );

  let brainMemoryId: string | undefined;
  if (deps.personalBrainMemory) {
    try {
      brainMemoryId = await deps.personalBrainMemory.recordOutcome({
        tenantId,
        command: naturalLanguage,
        intent: parsed.intent,
        outcome: result,
        success: brainResponse.error == null,
        confidence: parsed.confidence,
        commandId: saved.id,
        goalReached: brainResponse.summary?.goalReached,
        verifiedUplift: uplift,
        toolsUsed: brainResponse.toolTrace?.length,
      });
      if (brainMemoryId) {
        await deps.commandLog.updateBrainMemoryId(saved.id, brainMemoryId);
      }
    } catch {
      // Memory write is best-effort
    }
  } else {
    try {
      const brain = deps.personalBrainRegistry.get(tenantId, 'admin');
      brainMemoryId = await brain.remember({
        command: naturalLanguage,
        intent: parsed.intent,
        result,
      });
      if (brainMemoryId) {
        await deps.commandLog.updateBrainMemoryId(saved.id, brainMemoryId);
      }
    } catch {
      // Memory write is best-effort
    }
  }

  if (workflowRunId) {
    await workflowEngine.addStep(workflowRunId, 'respond', 'completed', {
      hasToolTrace: Boolean(brainResponse.toolTrace?.length),
    });
    if (brainMemoryId) {
      await workflowEngine.addStep(workflowRunId, 'remember', 'completed', { brainMemoryId });
    }
  }

  if (pendingActions.length > 0) {
    await linkProposalsToCommand(
      pendingActions.map((p) => p.proposalId),
      saved.id
    );
    await writeAuditLog({
      tenantId,
      module: 'admin-command-bar',
      action: 'brain_tool_proposed',
      actor: actorId,
      details: {
        commandId: saved.id,
        proposals: pendingActions.map((p) => ({
          id: p.proposalId,
          tool: p.tool,
          risk: p.risk,
          approvalId: p.approvalId,
          confidence: p.confidence,
          expectedImpact: p.expectedImpact,
        })),
      },
    });
  }

  if (brainResponse?.agentRunId) {
    await updateBrainAgentRunCommandId(brainResponse.agentRunId, tenantId, saved.id);
  }

  await writeAuditLog({
    tenantId,
    module: 'admin-command-bar',
    action: 'command_executed',
    actor: actorId,
    details: {
      intent: parsed.intent,
      result,
      verifiedUplift: uplift,
      workflowRunId,
      commandId: saved.id,
      explainabilitySourceType: 'command',
      explainabilitySourceId: saved.id,
      agentKey:
        specialistAgents?.[specialistAgents.length - 1]?.agentKey ??
        specialistMeta?.agentKey ??
        specialistDef?.agentKey,
      agentKeys:
        specialistAgents?.map((a) => a.agentKey) ??
        (specialistMeta ? [specialistMeta.agentKey] : specialistDef ? [specialistDef.agentKey] : undefined),
      executionMode,
    },
  });

  await persistCommandExplainability({
    tenantId,
    commandId: saved.id,
    rootRunId: brainResponse.agentRunId ?? rootRunId,
    collector: explainCollector,
    contextSnippets,
    recallMatches,
    collectiveSnippetCount,
    globalKnowledgeMessage: globalKnowledgeMeta?.message,
    agentContributions,
    planReasoning: brainResponse.plan?.reasoning,
    executionMode,
  });

  await orchestrator.execute({
    tenantId,
    actorId,
    task: 'admin.command',
    input: { intent: parsed.intent, command: naturalLanguage },
  });

  if (deps.globalKnowledgeService && brainResponse.summary?.goalReached) {
    await deps.globalKnowledgeService
      .getExperimentService()
      .recordOutcome(tenantId, 'goal_reached', 1);
  }
  if (deps.globalKnowledgeService && uplift != null) {
    await deps.globalKnowledgeService
      .getExperimentService()
      .recordOutcome(tenantId, 'uplift', uplift);
  }

  const brainErrors = [retrievalError, brainResponse.error].filter(Boolean);

  return {
    success: true as const,
    originalCommand: naturalLanguage,
    parsedIntent: parsed.intent,
    action: parsed.action,
    result,
    confidence: parsed.confidence,
    verifiedUplift: uplift,
    timestamp: new Date().toISOString(),
    commandId: saved.id,
    undoable,
    undoExpiresAt: undoable ? SuggestionService.undoExpiresAtFromNow().toISOString() : undefined,
    requiresApproval,
    riskBand,
    brain: {
      contextSnippets,
      recallMatches,
      actionProposal: brainResponse.actionProposal ?? agentResultActionProposal,
      recallCount: contextSnippets.length,
      toolTrace: brainResponse.toolTrace,
      pendingActions,
      autoExecuted: autoExecuted.length > 0 ? autoExecuted : undefined,
      agentRunId: brainResponse.agentRunId,
      transcript: brainResponse.transcript,
      workflowRunId,
      error: brainErrors.length > 0 ? brainErrors.join('; ') : undefined,
      checkpoint: brainResponse.checkpoint,
      awaitingApprovalId: brainResponse.awaitingApprovalId,
      runStatus: brainResponse.runStatus,
      plan: brainResponse.plan,
      summary: brainResponse.summary,
      globalKnowledge: globalKnowledgeMeta,
      knowledgeContributionNotice,
      memoryNotice,
      reflectionNotice,
      reflectionStored,
      memoryRecalled: memoryRecalled.length > 0 ? memoryRecalled : undefined,
      specialist: specialistMeta,
      agents: specialistAgents,
      executionMode,
      handoffChain:
        explainCollector.snapshotHandoffChain().length > 0
          ? explainCollector.snapshotHandoffChain()
          : undefined,
      agentContributions,
      actionConflicts,
      synthesisSource,
      sharedMemorySummary,
      agentTranscripts,
      explainabilityId: saved.id,
    },
  };
}
