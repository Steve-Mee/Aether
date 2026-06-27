import type { AgentStreamCallback, AgentStreamEvent } from '../command-brain/AgentStreamEvents';

/** Tags downstream stream events with the executing agent key. */
export function wrapAgentEvent(
  onEvent: AgentStreamCallback | undefined,
  agentKey: string
): AgentStreamCallback | undefined {
  if (!onEvent) return undefined;
  return (event: AgentStreamEvent) => {
    onEvent({ ...event, agentKey: event.agentKey ?? agentKey });
  };
}
