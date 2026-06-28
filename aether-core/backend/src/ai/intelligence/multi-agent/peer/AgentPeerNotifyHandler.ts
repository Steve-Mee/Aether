import { emitStreamEvent } from '../../command-brain/AgentStreamEvents';
import { eventBus } from '../../../../shared/events/eventBus';
import { summarizePayloadForAudit } from './AgentPeerMessage';
import type { PeerDelegationRequest, PeerDelegationResult } from '../types';
import type { SharedMemoryBridge } from '../memory/SharedMemoryBridge';
import { PeerHandoffAuditLog } from './PeerHandoffAuditLog';

const notifyDedup = new Set<string>();

export class AgentPeerNotifyHandler {
  private audit = new PeerHandoffAuditLog();

  constructor(private sharedMemoryBridge?: SharedMemoryBridge) {}

  async handleNotify(request: PeerDelegationRequest): Promise<PeerDelegationResult> {
    const dedupKey = `${request.tenantId}:${request.correlationId}:${request.targetAgentKey}`;
    if (request.correlationId && notifyDedup.has(dedupKey)) {
      return { success: true, narrative: 'Notify deduplicated' };
    }
    if (request.correlationId) {
      notifyDedup.add(dedupKey);
      if (notifyDedup.size > 5000) notifyDedup.clear();
    }

    emitStreamEvent(request.onEvent, {
      type: 'agent_peer_message',
      fromAgentKey: request.sourceAgentKey,
      toAgentKey: request.targetAgentKey,
      summary: request.contextPayload?.summary ?? request.query,
      correlationId: request.correlationId,
      messageType: 'notify',
    });

    if (this.sharedMemoryBridge && request.parentRunId) {
      await this.sharedMemoryBridge.recordNotify({
        tenantId: request.tenantId,
        runId: request.parentRunId,
        sourceAgentKey: request.sourceAgentKey,
        targetAgentKey: request.targetAgentKey,
        intent: request.intent,
        summary: request.contextPayload?.summary,
        payload: request.contextPayload?.payload as Record<string, unknown> | undefined,
        onEvent: request.onEvent,
      });
    }

    await this.audit.record({
      tenantId: request.tenantId,
      sourceAgentKey: request.sourceAgentKey,
      targetAgentKey: request.targetAgentKey,
      intent: request.intent,
      mode: 'orchestrated',
      success: true,
      latencyMs: 0,
      parentRunId: request.parentRunId,
      correlationId: request.correlationId,
      payloadSummary: summarizePayloadForAudit(request.contextPayload),
    });

    await eventBus.publish({
      tenantId: request.tenantId,
      type: 'agent.peer.notified',
      payload: {
        sourceAgentKey: request.sourceAgentKey,
        targetAgentKey: request.targetAgentKey,
        intent: request.intent,
        correlationId: request.correlationId,
        summary: request.contextPayload?.summary,
        parentRunId: request.parentRunId,
      },
      idempotencyKey: request.correlationId
        ? `agent.peer.notified:${request.correlationId}:${request.targetAgentKey}`
        : undefined,
    });

    return {
      success: true,
      narrative: `Notify delivered to ${request.targetAgentKey}`,
    };
  }
}
