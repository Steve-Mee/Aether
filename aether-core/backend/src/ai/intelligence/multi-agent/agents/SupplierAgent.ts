import type { SpecialistAgentDefinition } from '../types';

export const SUPPLIER_AGENT_KEY = 'supplier';

export const supplierAgentDefinition: SpecialistAgentDefinition = {
  agentKey: SUPPLIER_AGENT_KEY,
  displayName: 'Supplier Agent',
  rolePrompt:
    'Je bent de Supplier Agent van AETHER — specialist in leveranciersmonitoring, prijsdalingen detecteren en supplier syncs.',
  supportedIntents: ['SUPPLIER_MONITOR', 'SUPPLIER_CREATE'],
  allowedTools: [
    'search_products',
    'recall_memory',
    'syncSupplier',
    'createSupplier',
    'getPendingApprovals',
    'createInsight',
  ],
  memoryNamespace: SUPPLIER_AGENT_KEY,
  keywordPatterns: [
    /\b(leverancier|supplier|leveranciers)\b/i,
    /\bmonitor.*supplier|supplier.*monitor\b/i,
  ],
};
