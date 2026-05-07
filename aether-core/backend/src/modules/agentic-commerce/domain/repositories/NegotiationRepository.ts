import { Negotiation } from '../entities/Negotiation';

export interface NegotiationRepository {
  create(negotiation: Negotiation): Promise<Negotiation>;
  findById(id: string): Promise<Negotiation | null>;
  update(id: string, updates: Partial<Negotiation>): Promise<Negotiation>;
  findActive(): Promise<Negotiation[]>;
}