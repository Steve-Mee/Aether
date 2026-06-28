import { emitStreamEvent } from '../../command-brain/AgentStreamEvents';
import type { AgentStreamCallback } from '../../command-brain/AgentStreamEvents';
import { isMerchantMemoryDualWriteEnabled, isRunMemoryEnabled } from './runMemoryConfig';
import { shouldDualWriteToMerchant } from './merchantMemoryPromoteConfig';
import type { RunWorkingMemoryPort } from './RunWorkingMemoryPort';
import {
  SHARED_MEMORY_KEYS,
  normalizePeerPayloadToSharedKey,
  type AgentContributionRecord,
  type DecisionRecord,
} from './sharedMemorySchema';
import type { AgentContribution } from '../types';

export class SharedMemoryBridge {
  constructor(private runMemory: RunWorkingMemoryPort) {}

  async recordPeerHandoff(input: {
    tenantId: string;
    runId: string;
    sourceAgentKey: string;
    targetAgentKey: string;
    payload?: Record<string, unknown>;
    onEvent?: AgentStreamCallback;
  }): Promise<void> {
    if (!isRunMemoryEnabled() || !input.payload) return;

    const writes = normalizePeerPayloadToSharedKey(input.sourceAgentKey, input.payload);
    for (const write of writes) {
      await this.applyWrite({
        tenantId: input.tenantId,
        runId: input.runId,
        namespace: write.namespace,
        key: write.key,
        value: write.value,
        updatedByAgentKey: input.sourceAgentKey,
        mode: write.mode,
      });
      this.emitUpdated(
        input.onEvent,
        write.namespace,
        write.key,
        input.sourceAgentKey,
        write.value
      );
    }
  }

  async recordNotify(input: {
    tenantId: string;
    runId: string;
    sourceAgentKey: string;
    targetAgentKey: string;
    intent?: string;
    summary?: string;
    payload?: Record<string, unknown>;
    onEvent?: AgentStreamCallback;
  }): Promise<void> {
    if (!isRunMemoryEnabled()) return;

    const decision: DecisionRecord = {
      from: input.sourceAgentKey,
      intent: input.intent,
      summary: input.summary,
      timestamp: new Date().toISOString(),
      payload: input.payload,
    };

    await this.runMemory.appendToArray({
      tenantId: input.tenantId,
      runId: input.runId,
      namespace: 'shared',
      key: SHARED_MEMORY_KEYS.recentDecisions,
      value: decision,
      updatedByAgentKey: input.sourceAgentKey,
      maxItems: 20,
    });
    this.emitUpdated(
      input.onEvent,
      'shared',
      SHARED_MEMORY_KEYS.recentDecisions,
      input.sourceAgentKey,
      decision
    );

    if (input.payload) {
      await this.recordPeerHandoff({
        tenantId: input.tenantId,
        runId: input.runId,
        sourceAgentKey: input.sourceAgentKey,
        targetAgentKey: input.targetAgentKey,
        payload: input.payload,
        onEvent: input.onEvent,
      });
    }
  }

  async recordAgentCompletion(input: {
    tenantId: string;
    runId: string;
    agentKey: string;
    narrative?: string;
    resumeContextBlock?: string;
    onEvent?: AgentStreamCallback;
  }): Promise<void> {
    if (!isRunMemoryEnabled()) return;

    if (input.narrative) {
      await this.runMemory.set({
        tenantId: input.tenantId,
        runId: input.runId,
        namespace: input.agentKey,
        key: 'lastNarrative',
        value: { narrative: input.narrative.slice(0, 1000) },
        updatedByAgentKey: input.agentKey,
      });
      this.emitUpdated(input.onEvent, input.agentKey, 'lastNarrative', input.agentKey, {
        narrative: input.narrative.slice(0, 200),
      });
    }

    if (input.resumeContextBlock) {
      await this.runMemory.merge({
        tenantId: input.tenantId,
        runId: input.runId,
        namespace: 'shared',
        key: `resume:${input.agentKey}`,
        value: { contextBlock: input.resumeContextBlock },
        updatedByAgentKey: input.agentKey,
      });
    }

    await this.runMemory.merge({
      tenantId: input.tenantId,
      runId: input.runId,
      namespace: 'shared',
      key: SHARED_MEMORY_KEYS.businessSnapshot,
      value: {
        updatedAt: new Date().toISOString(),
        byAgent: input.agentKey,
      },
      updatedByAgentKey: input.agentKey,
    });
  }

  async recordContributions(input: {
    tenantId: string;
    runId: string;
    contributions: AgentContribution[];
    updatedByAgentKey?: string;
    onEvent?: AgentStreamCallback;
  }): Promise<void> {
    if (!isRunMemoryEnabled() || input.contributions.length === 0) return;

    const records: AgentContributionRecord[] = input.contributions.map((c) => ({
      agentKey: c.agentKey,
      summary: c.summary,
      status: c.status,
    }));

    await this.runMemory.set({
      tenantId: input.tenantId,
      runId: input.runId,
      namespace: 'shared',
      key: SHARED_MEMORY_KEYS.agentContributions,
      value: records,
      updatedByAgentKey: input.updatedByAgentKey ?? 'workflow_supervisor',
    });
    this.emitUpdated(
      input.onEvent,
      'shared',
      SHARED_MEMORY_KEYS.agentContributions,
      input.updatedByAgentKey ?? 'orchestrator',
      records
    );

    await this.runMemory.merge({
      tenantId: input.tenantId,
      runId: input.runId,
      namespace: 'shared',
      key: SHARED_MEMORY_KEYS.businessSnapshot,
      value: {
        updatedAt: new Date().toISOString(),
        byAgent: input.updatedByAgentKey ?? 'orchestrator',
        agentCount: input.contributions.length,
      },
      updatedByAgentKey: input.updatedByAgentKey ?? 'orchestrator',
    });
  }

  private async applyWrite(input: {
    tenantId: string;
    runId: string;
    namespace: string;
    key: string;
    value: unknown;
    updatedByAgentKey: string;
    mode: 'set' | 'merge' | 'append';
  }): Promise<void> {
    const base = {
      tenantId: input.tenantId,
      runId: input.runId,
      namespace: input.namespace,
      key: input.key,
      value: input.value,
      updatedByAgentKey: input.updatedByAgentKey,
    };

    if (input.mode === 'append') {
      await this.runMemory.appendToArray({ ...base, maxItems: 20 });
    } else if (input.mode === 'merge') {
      await this.runMemory.mergeWithVersion(base);
    } else {
      await this.runMemory.set(base);
    }

    if (isMerchantMemoryDualWriteEnabled() && shouldDualWriteToMerchant(input.namespace, input.key)) {
      await this.runMemory.mergeWithVersion({ ...base, scope: 'merchant' });
    }
  }

  private valuePreview(value: unknown): string {
    try {
      return JSON.stringify(value).slice(0, 200);
    } catch {
      return String(value).slice(0, 200);
    }
  }

  private emitUpdated(
    onEvent: AgentStreamCallback | undefined,
    namespace: string,
    key: string,
    updatedByAgentKey: string,
    value?: unknown
  ): void {
    emitStreamEvent(onEvent, {
      type: 'shared_memory_updated',
      namespace,
      key,
      agentKey: updatedByAgentKey,
      valuePreview: value !== undefined ? this.valuePreview(value) : undefined,
    });
  }
}
