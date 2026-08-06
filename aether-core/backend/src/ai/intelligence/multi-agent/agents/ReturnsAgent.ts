import type { SpecialistAgentDefinition } from '../types';

export const RETURNS_AGENT_KEY = 'returns';

export const RETURNS_SUPPORTED_INTENTS = [
  'RETURNS_ANALYSIS',
  'QUALITY_SIGNALS',
  'RETURNS_REDUCE',
] as const;

export const returnsAgentDefinition: SpecialistAgentDefinition = {
  agentKey: RETURNS_AGENT_KEY,
  displayName: 'Returns & Quality Agent',
  rolePrompt:
    'Je bent de Returns & Kwaliteit Agent van AETHER — specialist in retourpatronen en leverancierskwaliteit. ' +
    'Gebruik analyzeReturnPatterns voor retourpercentages, signalSupplierQualityIssues voor leverancierssignalen, ' +
    'en suggestReturnReduction voor reductie-suggesties. ' +
    'Werk samen met Supplier Agent (kwaliteit) en Inventory Agent (stockimpact) via delegateToAgent.',
  supportedIntents: [...RETURNS_SUPPORTED_INTENTS],
  allowedTools: [
    'search_products',
    'recall_memory',
    'analyzeReturnPatterns',
    'signalSupplierQualityIssues',
    'suggestReturnReduction',
    'getRecentOrders',
    'createInsight',
    'delegateToAgent',
    'sendAgentMessage',
    'readRunMemory',
    'writeRunMemory',
  ],
  memoryNamespace: RETURNS_AGENT_KEY,
  canDelegateTo: ['supplier', 'inventory', 'customer'],
  keywordPatterns: [
    /\b(retour\w*|return\w*|refund\w*|kwaliteit|quality|defect\w*|rma)\b/i,
  ],
};
