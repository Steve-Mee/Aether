import type { NegotiationMetricsPort } from '../ports/NegotiationMetricsPort';
import type { LlmInferencePort } from '../../../../shared/ai/LlmInferencePort';
import { defaultOllamaInference } from '../../../../shared/ai/OllamaInferenceAdapter';

export type NegotiationState = 'active' | 'counter' | 'accepted' | 'rejected' | 'expired';

export interface NegotiationRiskCaps {
  maxDiscountPct: number;
  maxRounds: number;
  timeoutMs: number;
}

const DEFAULT_CAPS: NegotiationRiskCaps = {
  maxDiscountPct: 20,
  maxRounds: 5,
  timeoutMs: 86400000,
};

export class NegotiationEngine {
  constructor(
    private metrics: NegotiationMetricsPort,
    private llm: LlmInferencePort = defaultOllamaInference
  ) {}

  getCaps(): NegotiationRiskCaps {
    return {
      maxDiscountPct: parseFloat(process.env.NEGOTIATION_MAX_DISCOUNT_PCT ?? String(DEFAULT_CAPS.maxDiscountPct)),
      maxRounds: parseInt(process.env.NEGOTIATION_MAX_ROUNDS ?? String(DEFAULT_CAPS.maxRounds), 10),
      timeoutMs: parseInt(process.env.NEGOTIATION_TIMEOUT_MS ?? String(DEFAULT_CAPS.timeoutMs), 10),
    };
  }

  async getMetrics(tenantId: string) {
    const row = await this.metrics.getMetrics(tenantId);
    const metrics = row ?? { accept: 0, counter: 0, reject: 0, llmUsed: 0 };
    const total = metrics.accept + metrics.counter + metrics.reject;
    return {
      ...metrics,
      totalDecisions: total,
      acceptanceRate: total === 0 ? 0 : metrics.accept / total,
      llmEnabled: process.env.AGENTIC_LLM_ENABLED === 'true',
    };
  }

  transition(current: NegotiationState, decision: 'ACCEPT' | 'COUNTER' | 'REJECT'): NegotiationState {
    if (decision === 'ACCEPT') return 'accepted';
    if (decision === 'REJECT') return 'rejected';
    return 'counter';
  }

  async evaluateOffer(
    tenantId: string,
    negotiationId: string,
    currentOffer: number,
    targetPrice: number,
    margin: number,
    roundCount = 0
  ): Promise<'ACCEPT' | 'COUNTER' | 'REJECT'> {
    const caps = this.getCaps();
    const rounds = roundCount + 1;

    if (process.env.AGENTIC_LLM_ENABLED === 'true') {
      const llmDecision = await this.evaluateWithLLM(currentOffer, targetPrice, margin);
      if (llmDecision) {
        if (rounds > caps.maxRounds) return 'REJECT';
        const discountPct = ((targetPrice - currentOffer) / targetPrice) * 100;
        if (discountPct > caps.maxDiscountPct) return 'REJECT';
        await this.metrics.recordDecision(tenantId, llmDecision, true);
        return llmDecision;
      }
    }

    const decision = this.evaluateRuleBased(rounds, currentOffer, targetPrice);
    await this.metrics.recordDecision(tenantId, decision);
    return decision;
  }

  private async evaluateWithLLM(
    currentOffer: number,
    targetPrice: number,
    margin: number
  ): Promise<'ACCEPT' | 'COUNTER' | 'REJECT' | null> {
    try {
      const prompt = `You are a merchant negotiation agent. Target price: €${targetPrice}, current offer: €${currentOffer}, margin: ${margin}%.
Respond with ONLY one word: ACCEPT, COUNTER, or REJECT.`;
      const raw = (await this.llm.generate({ prompt, temperature: 0.1 })).trim().toUpperCase();
      if (raw.includes('ACCEPT')) return 'ACCEPT';
      if (raw.includes('COUNTER')) return 'COUNTER';
      if (raw.includes('REJECT')) return 'REJECT';
    } catch {
      // fall through to rule engine
    }
    return null;
  }

  private evaluateRuleBased(
    rounds: number,
    currentOffer: number,
    targetPrice: number
  ): 'ACCEPT' | 'COUNTER' | 'REJECT' {
    const caps = this.getCaps();

    if (rounds > caps.maxRounds) return 'REJECT';

    const discountPct = ((targetPrice - currentOffer) / targetPrice) * 100;
    if (discountPct > caps.maxDiscountPct) return 'REJECT';

    const difference = Math.abs(currentOffer - targetPrice);
    if (difference < targetPrice * 0.05) return 'ACCEPT';
    if (difference < targetPrice * 0.15) return 'COUNTER';
    return 'REJECT';
  }

  calculateCounterOffer(currentOffer: number, targetPrice: number): number {
    const midpoint = (currentOffer + targetPrice) / 2;
    return Math.round(midpoint * 1.05 * 100) / 100;
  }
}
