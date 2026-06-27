import type { AgentPeerPort } from './AgentPeerPort';
import type { BrainToolContext, BrainToolExecutor } from '../../personal-brain/tools/types';

export interface DelegateToAgentToolDeps {
  peerBus: AgentPeerPort;
  defaultSourceAgentKey?: string;
}

export function delegateToAgentTool(deps: DelegateToAgentToolDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'delegateToAgent',
      description:
        'Delegate a read-only sub-task to another specialist agent and receive their narrative result',
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
      const result = await deps.peerBus.requestPeerHandoff({
        tenantId: ctx.tenantId,
        sourceAgentKey,
        targetAgentKey: String(input.targetAgentKey).trim(),
        intent: String(input.intent).trim(),
        query: String(input.query).trim(),
        parentRunId: ctx.parentRunId,
        actorId: ctx.actorId,
        depth: ctx.peerDepth ?? 0,
        onEvent: ctx.onEvent,
      });

      if (!result.success) {
        return { success: false, error: result.error ?? 'Peer delegation failed' };
      }

      return {
        success: true,
        targetAgentKey: input.targetAgentKey,
        narrative: result.narrative,
        agentRunId: result.agentRunId,
      };
    },
  };
}
