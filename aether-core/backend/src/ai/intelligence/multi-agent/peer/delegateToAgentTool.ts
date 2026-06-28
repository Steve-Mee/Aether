import { emitStreamEvent } from '../../command-brain/AgentStreamEvents';
import type { AgentPeerPort } from './AgentPeerPort';
import type { BrainToolContext, BrainToolExecutor } from '../../personal-brain/tools/types';
import type { AgentPeerMessage } from '../types';
import { buildPeerQuery, createCorrelationId } from './AgentPeerMessage';

export interface DelegateToAgentToolDeps {
  peerBus: AgentPeerPort;
  defaultSourceAgentKey?: string;
}

function parseContextPayload(raw: unknown): AgentPeerMessage | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const messageType =
    obj.messageType === 'intel' || obj.messageType === 'request' || obj.messageType === 'notify'
      ? obj.messageType
      : 'intel';
  const summary = String(obj.summary ?? obj.message ?? '').trim();
  if (!summary && !obj.payload) return undefined;
  return {
    messageType,
    summary: summary || 'Peer intel',
    payload:
      obj.payload && typeof obj.payload === 'object'
        ? (obj.payload as Record<string, unknown>)
        : undefined,
    correlationId: typeof obj.correlationId === 'string' ? obj.correlationId : undefined,
  };
}

export function delegateToAgentTool(deps: DelegateToAgentToolDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'delegateToAgent',
      description:
        'Delegate a read-only sub-task to another specialist agent and receive their narrative result. ' +
        'Optionally pass structured contextPayload (messageType, summary, payload) for typed intel handoff.',
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
        contextPayload: {
          type: 'object',
          required: false,
          description:
            'Structured peer message: { messageType: intel|request|notify, summary, payload?, correlationId? }',
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
      const sourceAgentKey = ctx.agentKey ?? deps.defaultSourceAgentKey ?? 'admin';
      const correlationId = createCorrelationId();
      const contextPayload = parseContextPayload(input.contextPayload);

      emitStreamEvent(ctx.onEvent, {
        type: 'agent_peer_message',
        fromAgentKey: sourceAgentKey,
        toAgentKey: String(input.targetAgentKey).trim(),
        summary: contextPayload?.summary ?? String(input.query).trim(),
        agentKey: sourceAgentKey,
      });

      const query = contextPayload
        ? buildPeerQuery({ ...contextPayload, correlationId: contextPayload.correlationId ?? correlationId })
        : String(input.query).trim();

      const result = await deps.peerBus.requestPeerHandoff({
        tenantId: ctx.tenantId,
        sourceAgentKey,
        targetAgentKey: String(input.targetAgentKey).trim(),
        intent: String(input.intent).trim(),
        query,
        parentRunId: ctx.parentRunId,
        actorId: ctx.actorId,
        depth: ctx.peerDepth ?? 0,
        contextPayload: contextPayload
          ? { ...contextPayload, correlationId: contextPayload.correlationId ?? correlationId }
          : undefined,
        correlationId: contextPayload?.correlationId ?? correlationId,
        onEvent: ctx.onEvent,
      });

      if (!result.success) {
        return { success: false, error: result.error ?? 'Peer delegation failed', correlationId };
      }

      return {
        success: true,
        targetAgentKey: input.targetAgentKey,
        narrative: result.narrative,
        agentRunId: result.agentRunId,
        correlationId,
      };
    },
  };
}
