import type { DomainEventType } from './eventBus';

/**
 * Critical event types that MUST have at least one subscriber registered at startup.
 * Missing handlers block app bootstrap (fail-fast).
 */
export const REQUIRED_EVENT_HANDLERS: DomainEventType[] = [
  'command.executed',
  'outcome.verified',
  'mail.approval_required',
  'supplier.price_changed',
];

const registeredHandlers = new Set<DomainEventType>();

export function markHandlerRegistered(type: DomainEventType): void {
  registeredHandlers.add(type);
}

export function assertAllRequiredHandlersRegistered(): void {
  const missing = REQUIRED_EVENT_HANDLERS.filter((t) => !registeredHandlers.has(t));
  if (missing.length > 0) {
    throw new Error(
      `Event integrity violation: missing required handlers for [${missing.join(', ')}]. ` +
        'Register all handlers in bootstrap/eventHandlers.ts before starting server.'
    );
  }
}

export function getRegisteredHandlers(): DomainEventType[] {
  return [...registeredHandlers];
}
