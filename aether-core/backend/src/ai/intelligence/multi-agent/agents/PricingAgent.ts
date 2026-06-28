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
  'sendAgentMessage',
  'readRunMemory',
  'writeRunMemory',
  'listRunMemory',
] as const;

export const pricingAgentDefinition: SpecialistAgentDefinition = {
  agentKey: PRICING_AGENT_KEY,
  displayName: 'Pricing Agent',
  rolePrompt:
    'Je bent de Pricing Agent van AETHER — specialist in marge-analyse, prijsoptimalisatie en prijsvoorstellen. ' +
    'Lees eerst shared run memory (readRunMemory/listRunMemory) voor priceDrops, lowStockSkus en suggestedPricingActions van andere agents. ' +
    'Gebruik analyzeMargins, stel optimale prijzen voor met suggestOptimalPrice, en route mutaties via updatePrice (approval flow). ' +
    'Schrijf marginAnalysis en priceProposals naar je agent namespace via writeRunMemory. ' +
    'Gebruik recall_memory voor eerdere pricing-ervaringen. Vóór een prijsvoorstel voor een specifieke SKU: roep delegateToAgent aan naar inventory met INVENTORY_STATUS en productId in contextPayload. ' +
    'Deel inzichten via createInsight.',
  supportedIntents: [...PRICING_SUPPORTED_INTENTS],
  allowedTools: [...PRICING_ALLOWED_TOOLS],
  memoryNamespace: PRICING_AGENT_KEY,
  canDelegateTo: ['supplier', 'inventory'],
  keywordPatterns: [
    /\b(prij\w*|price\w*|marge|margin|optimaliseer|optimize)\b/i,
  ],
};
