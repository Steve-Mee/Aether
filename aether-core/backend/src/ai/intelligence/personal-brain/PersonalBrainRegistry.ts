import type { EmbeddingPort } from '../vector-store/EmbeddingPort';
import type { VectorStorePort } from '../vector-store/VectorStorePort';
import type { AgentStatePort } from './AgentStatePort';
import type { LoRAAdapterPort } from './LoRAAdapterPort';
import { PersonalBrain } from './PersonalBrain';
import type { PersonalBrainPort } from './PersonalBrainPort';

export class PersonalBrainRegistry {
  private cache = new Map<string, PersonalBrainPort>();

  constructor(
    private vectorStore: VectorStorePort,
    private embedding: EmbeddingPort,
    private loraAdapter: LoRAAdapterPort,
    private agentState: AgentStatePort
  ) {}

  get(tenantId: string, agentKey = 'default'): PersonalBrainPort {
    const cacheKey = `${tenantId}:${agentKey}`;
    let brain = this.cache.get(cacheKey);
    if (!brain) {
      brain = new PersonalBrain(
        tenantId,
        this.vectorStore,
        this.embedding,
        this.loraAdapter,
        this.agentState,
        agentKey
      );
      this.cache.set(cacheKey, brain);
    }
    return brain;
  }

  /** Test helper — clear cached instances */
  clearCache(): void {
    this.cache.clear();
  }
}
