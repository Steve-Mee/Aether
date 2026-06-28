import { prisma } from '../prisma/client';
import { logger } from '../logging/logger';
import { requireTenantId } from '../tenant/tenantContext';
import { getEventBusMode, isExternalBrokerEnabled, shouldSkipInProcessDispatch } from '../messaging/messagingConfig';
import { getOutboxRelayService } from '../messaging/OutboxRelayService';
export type DomainEventType =
  | 'mail.processed'
  | 'mail.approval_required'
  | 'supplier.price_changed'
  | 'supplier.sync_completed'
  | 'command.executed'
  | 'decision.executed'
  | 'negotiation.updated'
  | 'outcome.recorded'
  | 'outcome.verified'
  | 'agent.peer.requested'
  | 'agent.peer.completed'
  | 'agent.peer.notified'
  | 'agent.handoff.completed'
  | 'inventory.low_stock_detected'
  | 'goals.progress_drift'
  | 'goal.completed';

export interface DomainEventPayload {
  tenantId: string;
  type: DomainEventType;
  payload: Record<string, unknown>;
  /** When set, duplicate publishes with same key are ignored (idempotent). */
  idempotencyKey?: string;
}

export interface DomainEventHandler {
  (event: DomainEventPayload): void | Promise<void>;
}

class AetherEventBus {
  private externalUrl = process.env.EVENT_BUS_URL;
  private handlers = new Map<DomainEventType | '*', DomainEventHandler[]>();

  async publish(event: DomainEventPayload): Promise<void> {
    const tenantId = requireTenantId(event.tenantId, 'eventBus.publish');

    if (event.idempotencyKey) {
      const existing = await prisma.domainEvent.findFirst({
        where: { idempotencyKey: event.idempotencyKey },
      });
      if (existing) {
        logger.info('domain_event_deduplicated', {
          type: event.type,
          tenantId,
          idempotencyKey: event.idempotencyKey,
        });
        return;
      }
    }

    const created = await prisma.domainEvent.create({
      data: {
        tenantId,
        type: event.type,
        payload: JSON.stringify(event.payload),
        idempotencyKey: event.idempotencyKey ?? null,
        processedAt: null,
      },
    });

    logger.info('domain_event_published', {
      type: event.type,
      tenantId,
      eventId: created.id,
      idempotencyKey: event.idempotencyKey,
    });

    if (this.externalUrl) {
      try {
        const axios = await import('axios');
        await axios.default.post(this.externalUrl, { ...event, tenantId }, { timeout: 3000 });
      } catch (error) {
        logger.warn('event_bus_external_failed', { error: String(error) });
      }
    }

    const skipLocal = shouldSkipInProcessDispatch(event.type);
    if (skipLocal) {
      await this.maybeRelay(created.id, event, tenantId);
      return;
    }

    await this.dispatchLocal({ ...event, tenantId }, created.id);

    if (isExternalBrokerEnabled() && getEventBusMode() === 'dual') {
      await this.maybeRelay(created.id, event, tenantId);
    }
  }

  private async maybeRelay(
    eventId: string,
    event: DomainEventPayload,
    tenantId: string
  ): Promise<void> {
    const relay = getOutboxRelayService();
    if (!relay) return;
    try {
      await relay.relayBatch(1);
    } catch (error) {
      logger.warn('event_bus_relay_trigger_failed', {
        eventId,
        type: event.type,
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async dispatchLocal(event: DomainEventPayload, eventId: string): Promise<void> {
    const handlerPayload: DomainEventPayload = {
      tenantId: event.tenantId,
      type: event.type,
      payload: event.payload,
      idempotencyKey: event.idempotencyKey,
    };

    try {
      await this.invokeHandlers(event.type, handlerPayload);
      await this.invokeHandlers('*', handlerPayload);

      await prisma.domainEvent.update({
        where: { id: eventId },
        data: { processedAt: new Date() },
      });
    } catch (error) {
      logger.error('domain_event_dispatch_failed', {
        eventId,
        type: event.type,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async invokeHandlers(
    type: DomainEventType | '*',
    event: DomainEventPayload
  ): Promise<void> {
    const list = this.handlers.get(type) ?? [];
    for (const handler of list) {
      await Promise.resolve(handler(event));
    }
  }

  /** Retry unprocessed outbox events (e.g. after crash before handler completion). */
  async processOutbox(limit = 50): Promise<number> {
    const pending = await prisma.domainEvent.findMany({
      where: { processedAt: null },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    let processed = 0;
    for (const row of pending) {
      const payload = JSON.parse(row.payload) as Record<string, unknown>;
      await this.dispatchLocal(
        {
          tenantId: row.tenantId,
          type: row.type as DomainEventType,
          payload,
          idempotencyKey: row.idempotencyKey ?? undefined,
        },
        row.id
      );
      processed += 1;
    }
    return processed;
  }

  subscribe(type: DomainEventType | '*', handler: DomainEventHandler): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);
  }

  /** Test-only: clear subscribers to avoid cross-test leakage. */
  resetHandlersForTests(): void {
    this.handlers.clear();
  }
}

export const eventBus = new AetherEventBus();
