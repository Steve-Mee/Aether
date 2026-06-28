export type MemoryScope = 'run' | 'merchant';

export interface RunMemoryEntry {
  namespace: string;
  key: string;
  value: unknown;
  version: number;
  updatedByAgentKey: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface RunMemoryWriteInput {
  tenantId: string;
  runId: string;
  namespace: string;
  key: string;
  value: unknown;
  updatedByAgentKey: string;
  scope?: MemoryScope;
  promotedFromRunId?: string;
}

export interface RunMemoryVersionResult {
  ok: boolean;
  version: number;
  conflict?: unknown;
  strategyResolved?: boolean;
}

export interface RunWorkingMemoryPort {
  get(
    tenantId: string,
    runId: string,
    namespace: string,
    key: string,
    scope?: MemoryScope
  ): Promise<unknown | null>;
  getWithVersion(
    tenantId: string,
    runId: string,
    namespace: string,
    key: string,
    scope?: MemoryScope
  ): Promise<{ value: unknown; version: number } | null>;
  set(input: RunMemoryWriteInput): Promise<void>;
  merge(input: RunMemoryWriteInput): Promise<void>;
  appendToArray(input: RunMemoryWriteInput & { maxItems?: number }): Promise<void>;
  compareAndSet(
    input: RunMemoryWriteInput & { expectedVersion?: number }
  ): Promise<RunMemoryVersionResult>;
  mergeWithVersion(
    input: RunMemoryWriteInput & { expectedVersion?: number }
  ): Promise<RunMemoryVersionResult>;
  list(
    tenantId: string,
    runId: string,
    namespace?: string,
    scope?: MemoryScope
  ): Promise<RunMemoryEntry[]>;
  buildPromptBlock(
    tenantId: string,
    runId: string,
    agentKey: string,
    maxChars?: number
  ): Promise<string>;
  buildMerchantPromptBlock(
    tenantId: string,
    agentKey: string,
    maxChars?: number
  ): Promise<string>;
  buildSharedSnapshot(
    tenantId: string,
    runId: string,
    scope?: MemoryScope
  ): Promise<Record<string, unknown>>;
  purgeExpired(scope?: MemoryScope, batchSize?: number): Promise<number>;
}
