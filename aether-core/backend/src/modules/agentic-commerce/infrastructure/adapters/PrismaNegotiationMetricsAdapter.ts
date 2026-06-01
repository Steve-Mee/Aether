import { prisma } from '../../../../shared/prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { NegotiationMetricsPort } from '../../application/ports/NegotiationMetricsPort';

export class PrismaNegotiationMetricsAdapter implements NegotiationMetricsPort {
  async getMetrics(tenantId: string) {
    const tid = requireTenantId(tenantId, 'NegotiationMetrics.get');
    return prisma.negotiationMetrics.findUnique({ where: { tenantId: tid } });
  }

  async recordDecision(
    tenantId: string,
    decision: 'ACCEPT' | 'COUNTER' | 'REJECT',
    llm = false
  ): Promise<void> {
    const tid = requireTenantId(tenantId, 'NegotiationMetrics.record');
    const inc =
      decision === 'ACCEPT'
        ? { accept: { increment: 1 } }
        : decision === 'COUNTER'
          ? { counter: { increment: 1 } }
          : { reject: { increment: 1 } };

    await prisma.negotiationMetrics.upsert({
      where: { tenantId: tid },
      create: {
        tenantId: tid,
        accept: decision === 'ACCEPT' ? 1 : 0,
        counter: decision === 'COUNTER' ? 1 : 0,
        reject: decision === 'REJECT' ? 1 : 0,
        llmUsed: llm ? 1 : 0,
      },
      update: {
        ...inc,
        ...(llm ? { llmUsed: { increment: 1 } } : {}),
      },
    });
  }
}

export const negotiationMetricsAdapter = new PrismaNegotiationMetricsAdapter();
