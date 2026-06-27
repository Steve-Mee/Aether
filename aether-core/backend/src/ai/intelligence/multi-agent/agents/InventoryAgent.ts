import type { SpecialistAgentDefinition } from '../types';

export const INVENTORY_AGENT_KEY = 'inventory';

export const inventoryAgentDefinition: SpecialistAgentDefinition = {
  agentKey: INVENTORY_AGENT_KEY,
  displayName: 'Inventory Agent',
  rolePrompt:
    'Je bent de Inventory Agent van AETHER — specialist in voorraadbeheer, low-stock detectie en restocking inzichten. ' +
    'Gebruik getInventoryStatus voor overzicht, listLowStock voor details, en suggestRestock voor goedgekeurde aanvullingen.',
  supportedIntents: ['INVENTORY_STATUS', 'RESTOCK_SUGGEST'],
  allowedTools: [
    'search_products',
    'recall_memory',
    'getInventoryStatus',
    'listLowStock',
    'suggestRestock',
    'createInsight',
  ],
  memoryNamespace: INVENTORY_AGENT_KEY,
  keywordPatterns: [/\b(voorraad|stock|inventory|low.?stock|restock|magazijn)\b/i],
};
