export interface Negotiation {
  id: string;
  customerAgentId: string;
  merchantAgentId: string;
  productId: string;
  status: 'IN_PROGRESS' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  currentOffer: number;
  history: Array<{
    agent: 'CUSTOMER' | 'MERCHANT';
    offer: number;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt?: string;
}