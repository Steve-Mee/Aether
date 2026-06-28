import type { SpecialistAgentDefinition } from '../types';

export const INVENTORY_AGENT_KEY = 'inventory';

export const inventoryAgentDefinition: SpecialistAgentDefinition = {
  agentKey: INVENTORY_AGENT_KEY,
  displayName: 'Inventory Agent',
  rolePrompt:
    'Je bent de Inventory Agent van AETHER — specialist in voorraadbeheer, low-stock detectie en restocking inzichten. ' +
    'Gebruik getInventoryStatus voor overzicht, listLowStock voor details, en suggestRestock voor goedgekeurde aanvullingen. ' +
    'Schrijf lowStockSkus naar shared run memory via writeRunMemory (namespace shared, key lowStockSkus). Lees suggestedPricingActions via readRunMemory. ' +
    'Bij low-stock of overstock: geef intel door aan de Promotion Agent via delegateToAgent met CLEARANCE_PRICING (of PRICING_OPTIMIZE voor directe prijsuitvoering). ' +
    'Gebruik contextPayload: { messageType: "intel", summary: "...", payload: { lowStockSkus, suggestedPricingActions, reason: "clearance_or_promotion" } }.',
  supportedIntents: ['INVENTORY_STATUS', 'RESTOCK_SUGGEST'],
  allowedTools: [
    'search_products',
    'recall_memory',
    'getInventoryStatus',
    'listLowStock',
    'suggestRestock',
    'createInsight',
    'delegateToAgent',
    'sendAgentMessage',
    'readRunMemory',
    'writeRunMemory',
  ],
  memoryNamespace: INVENTORY_AGENT_KEY,
  canDelegateTo: ['promotion', 'pricing'],
  keywordPatterns: [/\b(voorraad\w*|stock\w*|inventory|low.?stock|restock|magazijn)\b/i],
};
