import type { AgentStreamCallback, AgentStreamEvent } from '../AgentStreamEvents';
import { emitStreamEvent } from '../AgentStreamEvents';

export function emitLoopEvent(
  onEvent: AgentStreamCallback | undefined,
  agentKey: string | undefined,
  event: Omit<AgentStreamEvent, 'timestamp'>
): void {
  emitStreamEvent(onEvent, agentKey ? { ...event, agentKey } : event);
}
