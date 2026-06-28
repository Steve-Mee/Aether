/** Cross-screen signal after a command executes or undoes. */
export const COMMAND_EXECUTED_EVENT = 'aether:command-executed';

export function notifyCommandExecuted(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(COMMAND_EXECUTED_EVENT));
}
