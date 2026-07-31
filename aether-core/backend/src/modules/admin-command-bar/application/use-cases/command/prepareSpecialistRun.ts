import type { CommandLogPort } from '../../ports/CommandLogPort';
import type { AgentStreamCallback } from '../../../../../ai/intelligence/command-brain/AgentStreamEvents';
import { emitStreamEvent } from '../../../../../ai/intelligence/command-brain/AgentStreamEvents';
import { createBrainAgentRun } from '../../../../../ai/intelligence/command-brain/BrainAgentRunStore';
import { isRunMemoryEnabled } from '../../../../../ai/intelligence/multi-agent/memory/runMemoryConfig';
import { buildCollectiveContext } from '../../../../../ai/intelligence/global-knowledge/CollectiveContextBuilder';
import type { GlobalBrainPort } from '../../../../../ai/intelligence/global-brain/GlobalBrainPort';
import type { GlobalKnowledgeService } from '../../../../../ai/intelligence/global-knowledge/GlobalKnowledgeService';
import type { KnowledgeTransferPort } from '../../../../../ai/intelligence/knowledge-transfer/KnowledgeTransferPort';
import type { KnowledgeTransferGatePort } from '../../../../../ai/intelligence/knowledge-transfer/KnowledgeTransferGatePort';
import type { AgentPatternSyncService } from '../../../../../ai/intelligence/global-knowledge/agent-patterns/AgentPatternSyncService';

export interface PrepareSpecialistRunDeps {
  commandLog: CommandLogPort;
  globalBrain?: GlobalBrainPort;
  knowledgeTransfer?: KnowledgeTransferPort;
  globalKnowledgeService?: GlobalKnowledgeService;
  agentPatternSync?: AgentPatternSyncService;
  ktGate: KnowledgeTransferGatePort;
}

export interface PrepareSpecialistRunInput {
  tenantId: string;
  actorId?: string;
  naturalLanguage: string;
  parsed: { intent: string; confidence: number };
  handlerResult: string;
  contextSnippets: string[];
  specialistDef: { agentKey: string } | null;
  delegationEnabled: boolean;
  multiAgentPlan: boolean;
  streamOptions?: { onEvent?: AgentStreamCallback; abortSignal?: AbortSignal };
}

export async function prepareSpecialistRun(
  deps: PrepareSpecialistRunDeps,
  input: PrepareSpecialistRunInput
) {
  const {
    tenantId,
    actorId,
    naturalLanguage,
    parsed,
    handlerResult,
    contextSnippets,
    specialistDef,
    delegationEnabled,
    multiAgentPlan,
    streamOptions,
  } = input;

  const agentPatternSnippets = deps.agentPatternSync
    ? await deps.agentPatternSync.getContextSnippets(tenantId, specialistDef?.agentKey)
    : [];

  const collective = await buildCollectiveContext({
    tenantId,
    globalBrain: deps.globalBrain,
    knowledgeTransfer: deps.knowledgeTransfer,
    globalKnowledgeService: deps.globalKnowledgeService,
    ktGate: deps.ktGate,
    syncGlobalKnowledge: false,
    agentPatternSnippets,
  });

  let earlyCommandId: string | undefined;
  if (streamOptions?.onEvent) {
    const early = await deps.commandLog.save({
      tenantId,
      command: naturalLanguage,
      intent: parsed.intent,
      result: handlerResult || 'Processing…',
      confidence: parsed.confidence,
      actor: actorId,
    });
    earlyCommandId = early.id;
    emitStreamEvent(streamOptions.onEvent, {
      type: 'run_started',
      commandId: early.id,
      runStatus: 'running',
    });
  }

  let rootRunId: string | undefined;
  if (
    delegationEnabled &&
    isRunMemoryEnabled() &&
    (parsed.intent === 'COMPOUND_WORKFLOW' || multiAgentPlan || Boolean(specialistDef))
  ) {
    try {
      const rootRun = await createBrainAgentRun({
        tenantId,
        commandId: earlyCommandId,
        transcript: [],
        agentKey: 'admin',
        resumeContext: {
          command: naturalLanguage,
          handlerResult: handlerResult || '',
          parsedIntent: parsed.intent,
          contextSnippets,
          actorId,
          commandId: earlyCommandId,
        },
      });
      rootRunId = rootRun.id;
    } catch {
      // Root run is best-effort for run memory
    }
  }

  return { collective, earlyCommandId, rootRunId };
}
