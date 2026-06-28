import type { BrainContext, IndexKnowledgeInput, RecallResult, RememberInput } from './types';
import type { VectorQuery } from '../vector-store/types';

export interface RecallOptions {
  metadataFilter?: VectorQuery['metadataFilter'];
  minScore?: number;
}

export interface PersonalBrainPort {
  readonly tenantId: string;
  recall(query: string, limit?: number, options?: RecallOptions): Promise<RecallResult>;
  remember(input: RememberInput): Promise<string>;
  forgetMemory(id: string): Promise<void>;
  indexKnowledge(input: IndexKnowledgeInput): Promise<void>;
  getContext(): Promise<BrainContext>;
  updateAgentState(partial: Partial<BrainContext>): Promise<void>;
}
