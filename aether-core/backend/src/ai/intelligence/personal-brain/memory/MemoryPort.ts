import type {
  MemoryKind,
  MemoryRecallOptions,
  MemoryRecallResult,
  MemoryRecordInput,
  MemorySummary,
  ExperienceReflectionRecordInput,
  ReflectionMemoryInput,
  ScoredMemoryEntry,
} from './types';

export interface MemoryPort {
  recallForCommand(
    tenantId: string,
    command: string,
    options?: MemoryRecallOptions
  ): Promise<MemoryRecallResult>;
  recordOutcome(input: MemoryRecordInput): Promise<string | undefined>;
  recordReflection(input: ReflectionMemoryInput): Promise<string[]>;
  recordExperienceReflection(
    input: ExperienceReflectionRecordInput
  ): Promise<import('../reflection/types').ExperienceReflectionResult | null>;
  consolidateTenant(tenantId: string): Promise<number>;
  getSummary(tenantId: string): Promise<MemorySummary>;
  listEntries(tenantId: string, kind?: MemoryKind, limit?: number): Promise<
    Array<{
      id: string;
      kind: MemoryKind;
      command: string;
      summary: string;
      priority?: import('./types').MemoryPriority;
      rememberedAt?: string;
      expiresAt?: string;
    }>
  >;
  removeByBrainMemoryId(tenantId: string, brainMemoryId: string): Promise<void>;
  removeByCommandId(tenantId: string, commandId: string): Promise<void>;
  pruneLongTerm(tenantId: string): Promise<number>;
  pruneInteractionVectors(tenantId: string): Promise<number>;
  clearShortTerm(tenantId: string): Promise<void>;
  clearConversation(tenantId: string): Promise<void>;
}
