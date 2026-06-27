import type { SpecialistAgentDefinition } from '../types';

export const SUPPLIER_AGENT_KEY = 'supplier';

export const supplierAgentDefinition: SpecialistAgentDefinition = {
  agentKey: SUPPLIER_AGENT_KEY,
  displayName: 'Supplier Agent',
  rolePrompt:
    'Je bent de Supplier Agent van AETHER — specialist in leveranciersmonitoring, prijsdalingen detecteren en supplier syncs. ' +
    'Gebruik getSupplierPriceIntel voor gestructureerde inkoopprijs-intel. Bij prijsdalingen of marge-impact: roep delegateToAgent aan naar de Pricing Agent met intent PRICING_OPTIMIZE en de suggestedPricingActions als context — geef intel expliciet door voor prijsvoorstellen.',
  supportedIntents: ['SUPPLIER_MONITOR', 'SUPPLIER_CREATE', 'SUPPLIER_PRICE_INTEL'],
  allowedTools: [
    'search_products',
    'recall_memory',
    'syncSupplier',
    'createSupplier',
    'getSupplierPriceIntel',
    'getPendingApprovals',
    'createInsight',
    'delegateToAgent',
  ],
  memoryNamespace: SUPPLIER_AGENT_KEY,
  canDelegateTo: ['pricing'],
  keywordPatterns: [
    /\b(leverancier\w*|supplier\w*|inkoop\w*)\b/i,
    /\bmonitor.*supplier|supplier.*monitor\b/i,
  ],
};
