import { NegotiationEngine } from './application/services/NegotiationEngine';
import { negotiationMetricsAdapter } from './infrastructure/adapters/PrismaNegotiationMetricsAdapter';

export const negotiationEngine = new NegotiationEngine(negotiationMetricsAdapter);
