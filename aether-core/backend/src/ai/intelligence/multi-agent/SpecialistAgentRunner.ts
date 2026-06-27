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

export class SpecialistAgentRunner {
  constructor(
    private registry: AgentRegistry,
    private personalBrains: PersonalBrainRegistry,
    private agentLoop: BrainAgentLoop,
    private contextRetriever?: ContextRetriever,
    private merchantIndexer?: MerchantKnowledgeIndexer,
    private personalBrainMemory?: PersonalBrainMemoryService
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
    const agentKey = def.memoryNamespace;

    if (this.merchantIndexer) {
      try {
        await this.merchantIndexer.ensureIndexed(request.tenantId, agentKey);
      } catch {
        // Indexing is best-effort
      }
    }

    let contextSnippets = request.contextSnippets;
    if (this.contextRetriever) {
      try {
        const retrieved = await this.contextRetriever.retrieve({
          tenantId: request.tenantId,
          query: request.command,
          agentKey,
        });
        if (retrieved.length > 0) {
          contextSnippets = [...new Set([...contextSnippets, ...retrieved.map((c) => c.content)])];
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

    const brain = this.personalBrains.get(request.tenantId, agentKey);
    try {
      await brain.recall(request.command, 3);
    } catch {
      // Recall is best-effort
    }

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
