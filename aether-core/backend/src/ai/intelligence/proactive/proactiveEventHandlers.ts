import { eventBus, type DomainEventPayload } from '../../../shared/events/eventBus';
import { markHandlerRegistered } from '../../../shared/events/eventHandlerRegistry';
import { logger } from '../../../shared/logging/logger';
import { getCompositionRoot } from '../../../bootstrap/compositionRoot';
import { isProactiveBrainEnabled } from './proactiveConfig';

async function handleProactiveEvent(event: DomainEventPayload): Promise<void> {
  if (!isProactiveBrainEnabled()) return;
  try {
    const { proactiveSuggestionService } = getCompositionRoot();
    const count = await proactiveSuggestionService.evaluateAndIngestEvent(
      event.tenantId,
      event.type,
      event.payload
    );
    if (count > 0) {
      logger.info('proactive_suggestions_ingested', {
        tenantId: event.tenantId,
        eventType: event.type,
        count,
      });
    }
  } catch (err) {
    logger.warn('proactive_event_handler_failed', {
      tenantId: event.tenantId,
      eventType: event.type,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export function registerProactiveEventHandlers(): void {
  eventBus.subscribe('supplier.price_changed', handleProactiveEvent);

  eventBus.subscribe('inventory.low_stock_detected', handleProactiveEvent);
  markHandlerRegistered('inventory.low_stock_detected');

  eventBus.subscribe('goals.progress_drift', handleProactiveEvent);
  markHandlerRegistered('goals.progress_drift');
}
