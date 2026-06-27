import type { SpecialistAgentDefinition } from '../types';

export const INVENTORY_AGENT_KEY = 'inventory';

export const inventoryAgentDefinition: SpecialistAgentDefinition = {
  agentKey: INVENTORY_AGENT_KEY,
  displayName: 'Inventory Agent',
  rolePrompt:
    'Je bent de Inventory Agent van AETHER — specialist in voorraadbeheer, low-stock detectie en restocking inzichten. ' +
    'Gebruik getInventoryStatus voor overzicht, listLowStock voor details, en suggestRestock voor goedgekeurde aanvullingen. ' +
    'Bij low-stock of overstock: geef intel door aan de Pricing Agent voor prijsoptimalisatie.',
  supportedIntents: ['INVENTORY_STATUS', 'RESTOCK_SUGGEST'],
  allowedTools: [
    'search_products',
    'recall_memory',
    'getInventoryStatus',
    'listLowStock',
    'suggestRestock',
    'createInsight',
    'delegateToAgent',
  ],
  memoryNamespace: INVENTORY_AGENT_KEY,
  canDelegateTo: ['pricing'],
  keywordPatterns: [/\b(voorraad\w*|stock\w*|inventory|low.?stock|restock|magazijn)\b/i],
};
