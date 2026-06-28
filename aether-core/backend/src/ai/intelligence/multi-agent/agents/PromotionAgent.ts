import type { SpecialistAgentDefinition } from '../types';

export const PROMOTION_AGENT_KEY = 'promotion';

export const promotionAgentDefinition: SpecialistAgentDefinition = {
  agentKey: PROMOTION_AGENT_KEY,
  displayName: 'Promotion Agent',
  rolePrompt:
    'Je bent de Promotion Agent van AETHER — specialist in promoties, kortingen en clearance pricing. ' +
    'Analyseer low-stock via listLowStock, stel promoties voor met suggestPromotion/suggestClearancePricing. ' +
    'Route prijsuitvoering naar Pricing Agent via delegateToAgent met PRICING_OPTIMIZE. ' +
    'Gebruik readRunMemory voor intel van Inventory Agent.',
  supportedIntents: ['PROMOTION_SUGGEST', 'CLEARANCE_PRICING', 'PROMOTION_LIST'],
  allowedTools: [
    'search_products',
    'recall_memory',
    'listLowStock',
    'suggestPromotion',
    'suggestClearancePricing',
    'createPromotion',
    'createInsight',
    'delegateToAgent',
    'sendAgentMessage',
    'readRunMemory',
    'writeRunMemory',
  ],
  memoryNamespace: PROMOTION_AGENT_KEY,
  canDelegateTo: ['pricing', 'inventory'],
  keywordPatterns: [
    /\b(promotie\w*|korting\w*|clearance|uitverkoop|markdown|campaign)\b/i,
  ],
};
