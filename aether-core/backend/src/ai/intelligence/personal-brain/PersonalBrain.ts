import crypto from 'crypto';
import { requireTenantId } from '../../../shared/tenant/tenantContext';
import type { EmbeddingPort } from '../vector-store/EmbeddingPort';
import type { VectorStorePort } from '../vector-store/VectorStorePort';
import type { AgentStatePort } from './AgentStatePort';
import type { LoRAAdapterPort } from './LoRAAdapterPort';
import type { PersonalBrainPort } from './PersonalBrainPort';
import type { BrainContext, IndexKnowledgeInput, RecallResult, RememberInput } from './types';
import type { RecallOptions } from './PersonalBrainPort';

export class PersonalBrain implements PersonalBrainPort {
  readonly tenantId: string;
  private sessionKey: string;

  constructor(
    tenantId: string,
    private vectorStore: VectorStorePort,
    private embedding: EmbeddingPort,
    private loraAdapter: LoRAAdapterPort,
    private agentState: AgentStatePort,
    agentKey = 'default'
  ) {
    this.tenantId = requireTenantId(tenantId, 'PersonalBrain.constructor');
    this.sessionKey = agentKey;
  }

  async recall(query: string, limit = 5, options?: RecallOptions): Promise<RecallResult> {
    const embedding = await this.embedding.embed(query);
    const matches = await this.vectorStore.search(this.tenantId, {
      embedding,
      limit,
      metadataFilter: options?.metadataFilter,
      minScore: options?.minScore,
    });

    return {
      snippets: matches.map((m) => m.content),
      matches: matches.map((m) => ({
        id: m.id,
        score: m.score,
        content: m.content,
        metadata: m.metadata,
      })),
    };
  }

  async remember(input: RememberInput): Promise<string> {
    const content = `[${input.intent}] ${input.command} → ${input.result}`;
    const embedding = await this.embedding.embed(content);
    const id = crypto.createHash('sha256').update(`${this.tenantId}:${content}`).digest('hex').slice(0, 24);

    await this.vectorStore.upsert(this.tenantId, {
      id,
      content,
      embedding,
      metadata: {
        intent: input.intent,
        command: input.command,
        rememberedAt: new Date().toISOString(),
        ...input.metadata,
      },
    });
    return id;
  }

  /** Remove a memory document by stable id (used on command undo). */
  async forgetMemory(id: string): Promise<void> {
    await this.vectorStore.delete(this.tenantId, id);
  }

  /** Upsert a stable knowledge document (e.g. product catalog row) into the vector store. */
  async indexKnowledge(input: IndexKnowledgeInput): Promise<void> {
    const embedding = await this.embedding.embed(input.content);
    await this.vectorStore.upsert(this.tenantId, {
      id: input.id,
      content: input.content,
      embedding,
      metadata: {
        ...input.metadata,
        indexedAt: new Date().toISOString(),
      },
    });
  }

  async getContext(): Promise<BrainContext> {
    const lora = await this.loraAdapter.loadContext(this.tenantId);
    const saved = await this.agentState.getState(this.tenantId, this.sessionKey);

    return {
      loraAdapterId: lora.adapterId,
      loraVersion: lora.version,
      traits: lora.traits,
      lastIntent: saved?.lastIntent,
      lastCommandAt: saved?.lastCommandAt,
      appliedGlobalKnowledgeVersion: saved?.appliedGlobalKnowledgeVersion,
      lastGlobalKnowledgeSyncAt: saved?.lastGlobalKnowledgeSyncAt,
      appliedGlobalPatchIds: saved?.appliedGlobalPatchIds,
      shortTermMemory: saved?.shortTermMemory,
    };
  }

  async updateAgentState(partial: Partial<BrainContext>): Promise<void> {
    const current = await this.getContext();
    await this.agentState.saveState(this.tenantId, { ...current, ...partial }, this.sessionKey);
  }
}
