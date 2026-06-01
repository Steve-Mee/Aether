import { Negotiation } from '../entities/Negotiation';

export interface NegotiationRepository {
  create(
    negotiation: Omit<Negotiation, 'id' | 'history' | 'createdAt'> & { tenantId: string }
  ): Promise<Negotiation>;
  findById(id: string, tenantId: string): Promise<Negotiation | null>;
  update(id: string, updates: Partial<Negotiation>): Promise<Negotiation>;
  findActive(tenantId: string): Promise<Negotiation[]>;
  addOffer(
    negotiationId: string,
    offer: { price: number; agentId?: string; conditions?: string }
  ): Promise<void>;
}
