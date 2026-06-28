import { prisma } from '../prisma/client';
import { logger } from '../logging/logger';
import type { DomainEventType } from '../events/eventBus';
import { domainEventTopic, isExternalBrokerEnabled, shouldRunOutboxRelay, type OutboxRelayOwner } from './messagingConfig';
import type { BrokerMessage, MessageBrokerPort } from './MessageBrokerPort';

export class OutboxRelayService {
  constructor(private broker: MessageBrokerPort) {}

  async relayBatch(limit = 50): Promise<number> {
    if (!isExternalBrokerEnabled()) return 0;

    const claimed = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "DomainEvent"
        WHERE "relayedAt" IS NULL
        ORDER BY "createdAt" ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `;
      return rows;
    });

    let relayed = 0;
    for (const { id } of claimed) {
      const row = await prisma.domainEvent.findUnique({ where: { id } });
      if (!row || row.relayedAt) continue;

      try {
        const payload = JSON.parse(row.payload) as Record<string, unknown>;
        const message: BrokerMessage = {
          eventId: row.id,
          tenantId: row.tenantId,
          type: row.type as DomainEventType,
          payload,
          idempotencyKey: row.idempotencyKey ?? undefined,
        };
        await this.broker.produce(domainEventTopic(row.type), message);
        await prisma.domainEvent.update({
          where: { id: row.id },
          data: { relayedAt: new Date() },
        });
        relayed += 1;
      } catch (err) {
        logger.error('outbox_relay_failed', {
          eventId: row.id,
          type: row.type,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return relayed;
  }
}

let relayInstance: OutboxRelayService | null = null;

export function setOutboxRelayService(service: OutboxRelayService): void {
  relayInstance = service;
}

export function getOutboxRelayService(): OutboxRelayService | null {
  return relayInstance;
}

export function startOutboxRelayInterval(pollMs: number, role: OutboxRelayOwner = 'api'): () => void {
  if (!shouldRunOutboxRelay(role)) {
    logger.info('outbox_relay_skipped', { role, owner: process.env.OUTBOX_RELAY_OWNER ?? 'api' });
    return () => undefined;
  }

  const timer = setInterval(() => {
    void relayInstance?.relayBatch().catch((err) => {
      logger.error('outbox_relay_interval_failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }, pollMs);
  return () => clearInterval(timer);
}
