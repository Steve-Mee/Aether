import type { BrainAgentLoop } from '../command-brain/BrainAgentLoop';
import type { ContextRetriever } from '../retrieval/ContextRetriever';
import type { MerchantKnowledgeIndexer } from '../merchant-knowledge/MerchantKnowledgeIndexer';
import type { PersonalBrainRegistry } from '../personal-brain/PersonalBrainRegistry';
import type { PersonalBrainMemoryService } from '../personal-brain/memory/PersonalBrainMemoryService';
import type { AgentRegistry } from './AgentRegistry';
import type {
  SpecialistAgentDefinition,
  SpecialistExecuteRequest,
  SpecialistExecuteResult,
} from './types';

import type { RunWorkingMemoryPort } from './memory/RunWorkingMemoryPort';
import { isMerchantMemoryEnabled, isRunMemoryEnabled } from './memory/runMemoryConfig';
import { getCompositionRoot } from '../../../bootstrap/compositionRoot';
import { isAgentPaused } from '../../../shared/settings/agentPause';

export class SpecialistAgentRunner {
  constructor(
    private registry: AgentRegistry,
    private personalBrains: PersonalBrainRegistry,
    private agentLoop: BrainAgentLoop,
    private contextRetriever?: ContextRetriever,
    private merchantIndexer?: MerchantKnowledgeIndexer,
    private personalBrainMemory?: PersonalBrainMemoryService,
    private runMemory?: RunWorkingMemoryPort
  ) {}

  async run(request: SpecialistExecuteRequest): Promise<SpecialistExecuteResult> {
    const def =
      this.registry.get(request.agentKey) ??
      this.registry.resolve(request.intent, request.command);
    if (!def) {
      return { narrative: request.handlerResult, error: `Unknown specialist agent: ${request.agentKey}` };
    }

    return this.runWithDefinition(def, request);
  }

  async runWithDefinition(
    def: SpecialistAgentDefinition,
    request: SpecialistExecuteRequest
  ): Promise<SpecialistExecuteResult> {
    if (await isAgentPaused(request.tenantId, def.agentKey)) {
      return {
        narrative: request.handlerResult,
        error: `Agent ${def.agentKey} is gepauzeerd — geen autonome of gedelegeerde uitvoering`,
      };
    }

    const agentKey = def.memoryNamespace;

    if (this.merchantIndexer) {
      try {
        await this.merchantIndexer.ensureIndexed(request.tenantId, agentKey);
      } catch {
        // Indexing is best-effort
      }
    }

    let contextSnippets = request.contextSnippets;
    const explainability = request.explainabilityCollector;
    if (this.contextRetriever) {
      try {
        const retrieved = await this.contextRetriever.retrieve({
          tenantId: request.tenantId,
          query: request.command,
          agentKey,
        });
        if (retrieved.length > 0) {
          contextSnippets = [...new Set([...contextSnippets, ...retrieved.map((c) => c.content)])];
          explainability?.registerDataSources(
            retrieved.map((c, i) => ({
              kind: 'rag' as const,
              label: `RAG — ${agentKey} fragment ${i + 1}`,
              preview: c.content,
              score: c.score,
            }))
          );
        }
      } catch {
        // Retrieval is best-effort
      }
    }

    let memoryPromptBlock = request.memoryPromptBlock;
    if (this.personalBrainMemory && !memoryPromptBlock) {
      try {
        const memoryRecall = await this.personalBrainMemory.recallForCommand(
          request.tenantId,
          request.command,
          { intent: request.intent, agentKey }
        );
        memoryPromptBlock = memoryRecall.promptBlock;
      } catch {
        // Memory recall is best-effort
      }
    }

    const chainContext = request.chainContext ?? [];
    if (chainContext.length > 0) {
      contextSnippets = [...contextSnippets, ...chainContext];
    }

    if (this.runMemory && isMerchantMemoryEnabled()) {
      try {
        const merchantBlock = await this.runMemory.buildMerchantPromptBlock(
          request.tenantId,
          agentKey
        );
        if (merchantBlock) {
          contextSnippets = [...contextSnippets, merchantBlock];
          explainability?.registerDataSources([
            { kind: 'merchant_memory', label: `Merchant-geheugen (${agentKey})`, preview: merchantBlock },
          ]);
        }
      } catch {
        // Merchant memory is best-effort
      }
    }

    if (this.runMemory && request.parentRunId && isRunMemoryEnabled()) {
      try {
        const runMemoryBlock = await this.runMemory.buildPromptBlock(
          request.tenantId,
          request.parentRunId,
          agentKey
        );
        if (runMemoryBlock) {
          contextSnippets = [...contextSnippets, runMemoryBlock];
          explainability?.registerDataSources([
            { kind: 'shared_memory', label: `Run-geheugen (${agentKey})`, preview: runMemoryBlock },
          ]);
        }
      } catch {
        // Run memory is best-effort
      }
    }

    try {
      const goalBlock = await getCompositionRoot().goalContextProvider.buildAgentGoalsBlock(
        request.tenantId,
        agentKey
      );
      if (goalBlock) {
        contextSnippets = [...contextSnippets, goalBlock];
        explainability?.registerDataSources([
          { kind: 'merchant_memory', label: `Doelen (${agentKey})`, preview: goalBlock },
        ]);
      }
    } catch {
      // Goal context is best-effort
    }

    const brain = this.personalBrains.get(request.tenantId, agentKey);
    try {
      await brain.recall(request.command, 3);
    } catch {
      // Recall is best-effort
    }

    explainability?.registerAgent(agentKey, 'specialist');

    const loopResult = await this.agentLoop.run({
      tenantId: request.tenantId,
      command: request.command,
      parsedIntent: request.intent,
      parameters: request.parameters ?? {},
      contextSnippets,
      handlerResult: request.handlerResult,
      memoryPromptBlock,
      deferToTools: request.deferToTools ?? true,
      adaptiveLearningEnabled: request.adaptiveLearningEnabled,
      actorId: request.actorId,
      collectiveSnippets: request.collectiveSnippets,
      onEvent: request.onEvent,
      commandId: request.commandId,
      abortSignal: request.abortSignal,
      agentKey,
      rolePrompt: def.rolePrompt,
      allowedTools: def.allowedTools,
      parentRunId: request.parentRunId,
      handoffConstraints: request.handoffConstraints,
      peerDepth: request.peerDepth ?? 0,
      correlationId: request.correlationId,
    });

    const summaryText =
      loopResult.summary?.narrative ?? loopResult.narrative ?? request.handlerResult;

    return {
      narrative: loopResult.narrative,
      actionProposal: loopResult.actionProposal,
      error: loopResult.error,
      toolTrace: loopResult.toolTrace,
      pendingActions: loopResult.pendingActions,
      agentRunId: loopResult.agentRunId,
      checkpoint: loopResult.checkpoint,
      awaitingApprovalId: loopResult.awaitingApprovalId,
      runStatus: loopResult.runStatus,
      plan: loopResult.plan,
      summary: loopResult.summary,
      transcript: loopResult.transcript,
      handoffPackage: {
        sourceAgentKey: agentKey,
        targetAgentKey: 'admin',
        reflectionIds: [],
        summary: summaryText.slice(0, 500),
        constraints: request.handoffConstraints,
      },
    };
  }
}
