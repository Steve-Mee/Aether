import type { SpecialistAgentDefinition } from '../types';

export const CATALOG_AGENT_KEY = 'catalog';

export const catalogAgentDefinition: SpecialistAgentDefinition = {
  agentKey: CATALOG_AGENT_KEY,
  displayName: 'Product Catalog Agent',
  rolePrompt:
    'Je bent de Product Catalog Agent van AETHER — specialist in productcatalogus, zoeken en product-aanmaak. ' +
    'Gebruik listProducts voor overzicht, searchCatalogProducts voor gerichte zoekopdrachten, en proposeCreateProduct voor nieuwe producten (via approval queue). ' +
    'Bij nieuwe producten met prijs- of voorraadvragen: geef door via delegateToAgent naar pricing of inventory.',
  supportedIntents: ['CREATE_PRODUCT', 'PRODUCT_LIST', 'PRODUCT_SEARCH'],
  allowedTools: [
    'listProducts',
    'searchCatalogProducts',
    'proposeCreateProduct',
    'search_products',
    'recall_memory',
    'createInsight',
    'delegateToAgent',
  ],
  memoryNamespace: CATALOG_AGENT_KEY,
  canDelegateTo: ['pricing', 'inventory'],
  keywordPatterns: [
    /\b(product\w*|catalog\w*|catalogus|sku|artikel\w*)\b/i,
    /\b(nieuw\w*).*(product|artikel)/i,
  ],
};
