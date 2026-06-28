import type { AgentPeerPort } from './AgentPeerPort';
import type { AgentPeerJobPort } from './jobs/AgentPeerJobPort';
import type { BrainToolExecutor } from '../../personal-brain/tools/types';
import { isAsyncPeerEnabled } from './jobs/asyncPeerConfig';
import { eventBus } from '../../../../shared/events/eventBus';
import { emitStreamEvent } from '../../command-brain/AgentStreamEvents';
import { humanizeHandoffReason } from './handoffReason';

export interface DelegateToAgentAsyncToolDeps {
  peerBus: AgentPeerPort;
  jobPort: AgentPeerJobPort;
  defaultSourceAgentKey?: string;
}

export function delegateToAgentAsyncTool(deps: DelegateToAgentAsyncToolDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'delegateToAgentAsync',
      description:
        'Queue a fire-and-forget peer delegation to another specialist agent; returns immediately with a job id',
      parameters: {
        targetAgentKey: {
          type: 'string',
          required: true,
          description: 'Target agent key (e.g. inventory, supplier, pricing)',
        },
        intent: {
          type: 'string',
          required: true,
          description: 'Specialist intent for the target agent',
        },
        query: {
          type: 'string',
          required: true,
          description: 'Natural language query for the target agent',
        },
        notify: {
          type: 'boolean',
          required: false,
          description: 'Fire-and-forget notify-only (no full specialist run)',
        },
        contextPayload: {
          type: 'object',
          required: false,
          description: 'Structured peer message payload',
        },
      },
      risk: 'low',
      kind: 'read',
      module: 'multi-agent',
    },
    validate(input) {
      if (!String(input.targetAgentKey ?? '').trim()) {
        return { ok: false, error: 'targetAgentKey is required' };
      }
      if (!String(input.intent ?? '').trim()) {
        return { ok: false, error: 'intent is required' };
      }
      if (!String(input.query ?? '').trim()) {
        return { ok: false, error: 'query is required' };
      }
      return { ok: true };
    },
    async executeRead(ctx, input) {
      if (!isAsyncPeerEnabled()) {
        return { success: false, error: 'Async peer delegation is disabled' };
      }

      const sourceAgentKey = ctx.agentKey ?? deps.defaultSourceAgentKey ?? 'admin';
      const targetAgentKey = String(input.targetAgentKey).trim();
      const intent = String(input.intent).trim();
      const query = String(input.query).trim();

      const validation = deps.peerBus.validatePeerRequest?.({
        tenantId: ctx.tenantId,
        sourceAgentKey,
        targetAgentKey,
        intent,
        query,
        parentRunId: ctx.parentRunId,
        actorId: ctx.actorId,
        depth: ctx.peerDepth ?? 0,
      });

      if (validation && !validation.ok) {
        return { success: false, error: validation.error };
      }

      const idempotencyKey = ctx.parentRunId
        ? `async-peer:${ctx.parentRunId}:${sourceAgentKey}:${targetAgentKey}:${intent}`
        : undefined;

      const job = await deps.jobPort.enqueue({
        tenantId: ctx.tenantId,
        parentRunId: ctx.parentRunId,
        sourceAgentKey,
        targetAgentKey,
        intent,
        query,
        actorId: ctx.actorId,
        idempotencyKey,
        depth: ctx.peerDepth ?? 0,
        jobMode: input.notify ? 'notify' : 'handoff',
        messageType: input.notify ? 'notify' : undefined,
        contextPayload:
          input.contextPayload && typeof input.contextPayload === 'object'
            ? (input.contextPayload as Record<string, unknown>)
            : input.notify
              ? { messageType: 'notify', summary: query }
              : undefined,
      });

      emitStreamEvent(ctx.onEvent, {
        type: 'peer_job_queued',
        fromAgentKey: sourceAgentKey,
        toAgentKey: targetAgentKey,
        jobId: job.id,
        handoffReason: humanizeHandoffReason(`async:${intent}`),
      });

      await eventBus.publish({
        tenantId: ctx.tenantId,
        type: 'agent.peer.requested',
        payload: { jobId: job.id },
        idempotencyKey: `agent.peer.requested:${job.id}`,
      });

      return {
        success: true,
        jobId: job.id,
        status: 'queued',
        targetAgentKey,
      };
    },
  };
}
