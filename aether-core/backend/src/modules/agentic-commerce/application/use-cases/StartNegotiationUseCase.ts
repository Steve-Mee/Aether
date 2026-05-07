import { NegotiationEngine } from '../services/NegotiationEngine';

export class StartNegotiationUseCase {
  private engine = new NegotiationEngine();

  async execute(params: {
    customerAgentId: string;
    merchantAgentId: string;
    productId: string;
    initialOffer: number;
  }) {
    // For v0.5 we just create a simple negotiation record
    const negotiation = {
      id: `neg_${Date.now()}`,
      customerAgentId: params.customerAgentId,
      merchantAgentId: params.merchantAgentId,
      productId: params.productId,
      status: 'IN_PROGRESS',
      currentOffer: params.initialOffer,
      history: [
        {
          agent: 'CUSTOMER',
          offer: params.initialOffer,
          timestamp: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString()
    };

    // In real implementation: save to database
    console.log('[Agentic] New negotiation started:', negotiation.id);

    return negotiation;
  }
}