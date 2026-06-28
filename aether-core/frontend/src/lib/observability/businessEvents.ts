import { classifyError } from '@/lib/api/errors';
import { reportMessage } from './errorReporter';
import { logger } from './logger';

export type BusinessEventName =
  | 'command.executed'
  | 'command.undo'
  | 'approval.resolved'
  | 'approval.bulk_resolved'
  | 'approval.auto_apply'
  | 'supplier.synced'
  | 'supplier.created'
  | 'supplier.settings_updated'
  | 'autonomous.executed'
  | 'settings.updated'
  | 'outcomes.reconciled'
  | 'auth.sign_in'
  | 'auth.sign_out'
  | 'truth.review_submitted'
  | 'notification.read'
  | 'notification.received'
  | 'mutation.failed';

export function trackBusinessEvent(
  name: BusinessEventName,
  properties?: Record<string, string | number | boolean | null | undefined>,
): void {
  const payload = Object.fromEntries(
    Object.entries(properties ?? {}).filter(([, value]) => value !== undefined),
  ) as Record<string, unknown>;

  logger.info(name, payload);
  reportMessage(name, 'info', { event: name, ...payload });
}

export function trackMutationFailure(domain: string | undefined, error: unknown): void {
  const classified = classifyError(error);
  trackBusinessEvent('mutation.failed', {
    domain: domain ?? 'unknown',
    kind: classified.kind,
    status: classified.status ?? null,
  });
}
