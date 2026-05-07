import { NegotiationEngine } from '../services/NegotiationEngine';

export class RespondToOfferUseCase {
  private engine = new NegotiationEngine();

  async execute(negotiationId: string, params: { offer: number; agentId: string }) {
    const { offer, agentId } = params;

    // Simulate evaluation (in real version this would load from DB)
    const targetPrice = 89.99; // This would come from product data
    const decision = await this.engine.evaluateOffer(offer, targetPrice, 0.35);

    let response: any = {
      negotiationId,
      decision,
      timestamp: new Date().toISOString()
    };

    if (decision === 'COUNTER') {
      response.counterOffer = this.engine.calculateCounterOffer(offer, targetPrice);
      response.message = `Counter offer of €${response.counterOffer}`;
    } else if (decision === 'ACCEPT') {
      response.message = 'Offer accepted!';
    } else {
      response.message = 'Offer rejected. No further negotiation possible.';
    }

    console.log('[Agentic] Offer evaluated:', response);

    return response;
  }
}