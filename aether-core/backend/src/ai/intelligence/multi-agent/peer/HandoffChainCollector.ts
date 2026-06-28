import type { AgentStreamCallback, AgentStreamEvent } from '../../command-brain/AgentStreamEvents';
import type { HandoffChainEntry } from '../types';

export class HandoffChainCollector {
  readonly entries: HandoffChainEntry[] = [];

  wrap(onEvent?: AgentStreamCallback): AgentStreamCallback | undefined {
    if (!onEvent) return undefined;
    return (event: AgentStreamEvent) => {
      this.observe(event);
      onEvent(event);
    };
  }

  observe(event: AgentStreamEvent): void {
    if (event.type === 'agent_handoff' && event.fromAgentKey && event.toAgentKey) {
      this.entries.push({
        from: event.fromAgentKey,
        to: event.toAgentKey,
        reason: event.handoffReason ?? '',
        mode: 'sync',
        handoffMode: event.handoffMode ?? 'orchestrated',
        correlationId: event.correlationId,
        messageType: event.messageType,
      });
    }
    if (event.type === 'agent_peer_message' && event.fromAgentKey && event.toAgentKey) {
      const existing = this.entries.find(
        (e) =>
          e.from === event.fromAgentKey &&
          e.to === event.toAgentKey &&
          e.correlationId === event.correlationId
      );
      if (!existing) {
        this.entries.push({
          from: event.fromAgentKey,
          to: event.toAgentKey,
          reason: event.summary ?? 'peer message',
          mode: 'sync',
          correlationId: event.correlationId,
          messageType: event.messageType,
        });
      }
    }
    if (event.type === 'peer_job_queued' && event.fromAgentKey && event.toAgentKey) {
      this.entries.push({
        from: event.fromAgentKey,
        to: event.toAgentKey,
        reason: event.handoffReason ?? 'async',
        mode: 'async',
        jobId: event.jobId,
        status: 'pending',
      });
    }
    if (event.type === 'peer_job_completed' && event.jobId) {
      const entry = this.entries.find((e) => e.jobId === event.jobId);
      if (entry) {
        entry.status = 'completed';
        if (event.summary) entry.summary = event.summary;
      }
    }
    if (event.type === 'peer_job_failed' && event.jobId) {
      const entry = this.entries.find((e) => e.jobId === event.jobId);
      if (entry) {
        entry.status = 'failed';
        if (event.error) entry.summary = event.error;
      }
    }
    if (event.type === 'handoff_chain_update' && event.handoffChain) {
      this.entries.splice(0, this.entries.length, ...event.handoffChain);
    }
  }

  snapshot(): HandoffChainEntry[] {
    return this.entries.map((e) => ({ ...e }));
  }
}
