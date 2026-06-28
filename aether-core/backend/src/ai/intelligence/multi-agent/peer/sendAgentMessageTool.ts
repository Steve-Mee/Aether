import type { AgentPeerPort } from './AgentPeerPort';
import type { BrainToolExecutor } from '../../personal-brain/tools/types';
import { delegateToAgentTool, type DelegateToAgentToolDeps } from './delegateToAgentTool';

/** Developer-friendly alias for delegateToAgent with messageType defaulting to 'request'. */
export function sendAgentMessageTool(deps: DelegateToAgentToolDeps): BrainToolExecutor {
  const base = delegateToAgentTool(deps);
  return {
    ...base,
    definition: {
      ...base.definition,
      name: 'sendAgentMessage',
      description:
        'Send a structured message to another specialist agent and receive their response. ' +
        'Use messageType intel for sharing findings, request for asking another agent to act.',
      parameters: {
        toAgentKey: {
          type: 'string',
          required: true,
          description: 'Target agent key (e.g. inventory, supplier, pricing)',
        },
        intent: {
          type: 'string',
          required: true,
          description: 'Specialist intent for the target agent',
        },
        message: {
          type: 'string',
          required: true,
          description: 'Natural language message for the target agent',
        },
        messageType: {
          type: 'string',
          required: false,
          description: 'intel | request | notify (default: request)',
        },
        context: {
          type: 'object',
          required: false,
          description: 'Structured payload (productIds, actions, etc.)',
        },
      },
    },
    validate(input) {
      if (!String(input.toAgentKey ?? '').trim()) {
        return { ok: false, error: 'toAgentKey is required' };
      }
      if (!String(input.intent ?? '').trim()) {
        return { ok: false, error: 'intent is required' };
      }
      if (!String(input.message ?? '').trim()) {
        return { ok: false, error: 'message is required' };
      }
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const messageType =
        input.messageType === 'intel' || input.messageType === 'notify' ? input.messageType : 'request';
      return base.executeRead!(ctx, {
        targetAgentKey: input.toAgentKey,
        intent: input.intent,
        query: input.message,
        contextPayload: {
          messageType,
          summary: String(input.message).trim(),
          payload:
            input.context && typeof input.context === 'object'
              ? (input.context as Record<string, unknown>)
              : undefined,
        },
      });
    },
  };
}
