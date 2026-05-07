export interface Offer {
  id: string;
  negotiationId: string;
  agentId: string;
  amount: number;
  currency: string;
  validUntil?: Date;
  createdAt: Date;
}