import { prisma } from '../prisma/client';
import { isExternalBrokerEnabled } from './messagingConfig';

export async function getOutboxRelayBacklogCount(): Promise<number> {
  if (!isExternalBrokerEnabled()) return 0;
  return prisma.domainEvent.count({ where: { relayedAt: null } });
}

export async function getUnprocessedEventCount(): Promise<number> {
  return prisma.domainEvent.count({ where: { processedAt: null } });
}
