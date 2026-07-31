import {
  agentDisplayLabel,
  agentHandoffLabel,
  agentWorkingLabel,
  formatAgentKeysLabel,
  humanizeHandoffReason,
} from '@/lib/agentDisplay';
import { t } from '@/lib/i18n';
import type { AgentStreamEvent } from '@/types/command';
import type { CommandStreamStep } from './types';

export type { CommandStreamStep } from './types';

export function eventToStep(event: AgentStreamEvent, index: number): CommandStreamStep | null {
  const agentPrefix = event.agentKey ? `${event.agentKey}-` : '';
  const agentKey = event.agentKey;

  switch (event.type) {
    case 'thinking':
      return {
        id: `${agentPrefix}thinking-${index}`,
        label: t('command.brain.thinking'),
        summary: event.narrative ?? '…',
        done: false,
        status: 'pending',
        agentKey,
      };
    case 'plan_ready':
      return null;
    case 'plan_revised':
      return {
        id: `${agentPrefix}plan-revised-${event.revision ?? index}`,
        label: t('command.brain.planRevised'),
        summary: event.goal ?? '',
        done: false,
        status: 'pending',
        agentKey,
      };
    case 'reflection':
      return {
        id: `${agentPrefix}reflection-${index}`,
        label: t('command.brain.reflection'),
        summary: (event.observation ?? '').slice(0, 120),
        done: true,
        status: 'ok',
        agentKey,
      };
    case 'step_progress': {
      const label =
        event.steps?.[(event.planStep ?? 1) - 1]?.label ??
        `${t('command.brain.planStep')} ${event.planStep ?? ''}`;
      const done = event.stepStatus === 'done' || event.stepStatus === 'failed';
      return {
        id: `${agentPrefix}plan-step-${event.planStep ?? index}`,
        label,
        summary:
          event.stepStatus === 'failed'
            ? t('command.brain.stepFailed')
            : event.stepStatus === 'running'
              ? t('command.brain.stepRunning')
              : t('command.brain.stepDone'),
        done,
        status: event.stepStatus === 'failed' ? 'error' : done ? 'ok' : 'pending',
        agentKey,
      };
    }
    case 'tool_start':
      return {
        id: `${agentPrefix}tool-${event.tool}-${index}`,
        label: event.tool ?? 'tool',
        summary: event.summary ?? '',
        done: false,
        status: 'pending',
        agentKey,
      };
    case 'tool_result':
      return {
        id: `${agentPrefix}tool-result-${event.tool}-${index}`,
        label: event.tool ?? 'tool',
        summary: (event.output ?? '').slice(0, 120),
        done: true,
        status: 'ok',
        agentKey,
      };
    case 'proposal_ready':
      return {
        id: `${agentPrefix}proposal-${event.proposalId}`,
        label: event.tool ?? 'proposal',
        summary: event.summary ?? '',
        done: false,
        status: 'pending',
        agentKey,
      };
    case 'checkpoint':
      return {
        id: `${agentPrefix}checkpoint-${event.proposalId ?? index}`,
        label: t('command.brain.stepAwaitingApproval'),
        summary: event.summary ?? '',
        done: false,
        status: 'pending',
        checkpoint: true,
        agentKey,
      };
    case 'narrative_delta':
      return {
        id: `${agentPrefix}narrative-${index}`,
        label: t('command.brain.stepAssistant'),
        summary: (event.narrative ?? '').slice(0, 120),
        done: true,
        status: 'ok',
        agentKey,
      };
    case 'agent_assigned': {
      const keys = event.agentKey ?? '';
      const label = agentWorkingLabel(keys, t('command.brain.agentWorkingSuffix'));
      return {
        id: `agent-${keys || index}`,
        label,
        summary: keys.includes(',') ? formatAgentKeysLabel(keys) : agentDisplayLabel(keys),
        done: false,
        status: 'pending',
      };
    }
    case 'agent_started':
      return {
        id: `agent-start-${event.agentKey}-${index}`,
        label: agentWorkingLabel(event.agentKey ?? '', t('command.brain.agentWorkingSuffix')),
        summary: agentDisplayLabel(event.agentKey ?? ''),
        done: false,
        status: 'pending',
        agentKey: event.agentKey,
      };
    case 'agent_completed':
      return {
        id: `agent-done-${event.agentKey}-${index}`,
        label: `${agentDisplayLabel(event.agentKey ?? '')} ✓`,
        summary: event.error ?? event.summary ?? t('command.brain.stepDone'),
        done: true,
        status: event.error ? 'error' : 'ok',
        agentKey: event.agentKey,
      };
    case 'agent_handoff':
      return {
        id: `handoff-${event.fromAgentKey}-${event.toAgentKey}-${index}`,
        label: agentHandoffLabel(
          event.fromAgentKey ?? '',
          event.toAgentKey ?? '',
          t('command.brain.agentHandoffArrow'),
        ),
        summary: humanizeHandoffReason(event.handoffReason ?? ''),
        done: true,
        status: 'ok',
      };
    case 'peer_job_queued':
      return {
        id: `peer-queued-${event.jobId ?? index}`,
        label: agentHandoffLabel(
          event.fromAgentKey ?? '',
          event.toAgentKey ?? '',
          t('command.brain.agentHandoffArrow'),
        ),
        summary: t('command.brain.asyncPeerQueued'),
        done: false,
        status: 'pending',
      };
    case 'peer_job_completed':
      return {
        id: `peer-done-${event.jobId ?? index}`,
        label: t('command.brain.asyncPeerCompleted'),
        summary: event.summary ?? '',
        done: true,
        status: 'ok',
      };
    case 'peer_job_failed':
      return {
        id: `peer-fail-${event.jobId ?? index}`,
        label: t('command.brain.asyncPeerFailed'),
        summary: event.error ?? '',
        done: true,
        status: 'error',
      };
    case 'error':
      return {
        id: `error-${index}`,
        label: 'error',
        summary: event.error ?? 'Error',
        done: true,
        status: 'error',
      };
    default:
      return null;
  }
}
