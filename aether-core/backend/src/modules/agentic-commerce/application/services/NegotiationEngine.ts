export class NegotiationEngine {
  /**
   * Simple negotiation logic for v0.5
   * Later this will use local LLM for smarter decisions
   */
  async evaluateOffer(currentOffer: number, targetPrice: number, margin: number): Promise<'ACCEPT' | 'COUNTER' | 'REJECT'> {
    const difference = Math.abs(currentOffer - targetPrice);

    if (difference < targetPrice * 0.05) {
      return 'ACCEPT'; // Within 5% — accept
    } else if (difference < targetPrice * 0.15) {
      return 'COUNTER'; // Within 15% — counter offer
    } else {
      return 'REJECT'; // Too far off
    }
  }

  calculateCounterOffer(currentOffer: number, targetPrice: number): number {
    // Simple counter: meet in the middle + 5%
    const midpoint = (currentOffer + targetPrice) / 2;
    return Math.round(midpoint * 1.05 * 100) / 100;
  }
}