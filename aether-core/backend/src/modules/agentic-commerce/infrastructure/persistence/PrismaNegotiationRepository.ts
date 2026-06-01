import { PrismaClient } from '@prisma/client';
import { NegotiationRepository } from '../../domain/repositories/NegotiationRepository';
import { Negotiation } from '../../domain/entities/Negotiation';

export class PrismaNegotiationRepository implements NegotiationRepository {
  constructor(private prisma: PrismaClient) {}

  async create(negotiation: Omit<Negotiation, 'id' | 'history' | 'createdAt'> & { tenantId: string }): Promise<Negotiation> {
    const row = await this.prisma.negotiation.create({
      data: {
        tenantId: negotiation.tenantId,
        customerAgentId: negotiation.customerAgentId,
        merchantAgentId: negotiation.merchantAgentId,
        productId: negotiation.productId,
        status: negotiation.status,
        currentOffer: negotiation.currentOffer,
      },
    });
    return this.toDomain(row);
  }

  async findById(id: string, tenantId: string): Promise<Negotiation | null> {
    const row = await this.prisma.negotiation.findFirst({
      where: { id, tenantId },
      include: { offers: true },
    });
    return row ? this.toDomain(row) : null;
  }

  async update(id: string, updates: Partial<Negotiation>): Promise<Negotiation> {
    const row = await this.prisma.negotiation.update({
      where: { id },
      data: {
        status: updates.status,
        currentOffer: updates.currentOffer,
      },
      include: { offers: true },
    });
    return this.toDomain(row);
  }

  async findActive(tenantId: string): Promise<Negotiation[]> {
    const rows = await this.prisma.negotiation.findMany({
      where: { tenantId, status: { in: ['active', 'IN_PROGRESS', 'counter'] } },
      include: { offers: true },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async addOffer(negotiationId: string, offer: { price: number; agentId?: string; conditions?: string }) {
    await this.prisma.offer.create({
      data: {
        negotiationId,
        price: offer.price,
        agentId: offer.agentId,
        conditions: offer.conditions,
        status: 'pending',
      },
    });
  }

  private toDomain(row: {
    id: string;
    customerAgentId: string;
    merchantAgentId: string;
    productId: string | null;
    status: string;
    currentOffer: number | null;
    createdAt: Date;
    offers?: Array<{ price: number; agentId: string | null; createdAt: Date }>;
  }): Negotiation {
    return {
      id: row.id,
      customerAgentId: row.customerAgentId,
      merchantAgentId: row.merchantAgentId,
      productId: row.productId ?? '',
      status: row.status as Negotiation['status'],
      currentOffer: row.currentOffer ?? 0,
      history: (row.offers ?? []).map((o) => ({
        agent: 'CUSTOMER' as const,
        offer: o.price,
        timestamp: o.createdAt.toISOString(),
      })),
      createdAt: row.createdAt.toISOString(),
    };
  }
}
