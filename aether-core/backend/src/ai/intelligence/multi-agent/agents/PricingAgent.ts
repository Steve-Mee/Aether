import type { SpecialistAgentDefinition } from '../types';

export const PRICING_AGENT_KEY = 'pricing';

export const PRICING_SUPPORTED_INTENTS = [
  'PRICE_UPDATE',
  'LOW_MARGIN_REPORT',
  'PRICING_OPTIMIZE',
] as const;

export const PRICING_ALLOWED_TOOLS = [
  'search_products',
  'getProductInfo',
  'recall_memory',
  'updatePrice',
  'createInsight',
  'analyzeMargins',
  'suggestOptimalPrice',
  'delegateToAgent',
  'delegateToAgentAsync',
] as const;

export const pricingAgentDefinition: SpecialistAgentDefinition = {
  agentKey: PRICING_AGENT_KEY,
  displayName: 'Pricing Agent',
  rolePrompt:
    'Je bent de Pricing Agent van AETHER — specialist in marge-analyse, prijsoptimalisatie en prijsvoorstellen. ' +
    'Analyseer marges met analyzeMargins, stel optimale prijzen voor met suggestOptimalPrice, en route mutaties via updatePrice (approval flow). ' +
    'Gebruik recall_memory voor eerdere pricing-ervaringen. Neem inventory context mee bij prijsvoorstellen. Deel inzichten via createInsight.',
  supportedIntents: [...PRICING_SUPPORTED_INTENTS],
  allowedTools: [...PRICING_ALLOWED_TOOLS],
  memoryNamespace: PRICING_AGENT_KEY,
  canDelegateTo: ['supplier', 'inventory'],
  keywordPatterns: [
    /\b(prij\w*|price\w*|marge|margin|optimaliseer|optimize)\b/i,
  ],
};
