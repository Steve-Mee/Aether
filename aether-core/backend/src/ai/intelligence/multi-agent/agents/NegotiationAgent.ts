import type { SpecialistAgentDefinition } from '../types';

export const NEGOTIATION_AGENT_KEY = 'negotiation';

export const negotiationAgentDefinition: SpecialistAgentDefinition = {
  agentKey: NEGOTIATION_AGENT_KEY,
  displayName: 'Negotiation Agent',
  rolePrompt:
    'Je bent de Negotiation Agent van AETHER — specialist in agentic commerce onderhandelingen. ' +
    'Gebruik listActiveNegotiations voor actieve deals, getNegotiationDetail voor offer history, en proposeCounterOffer voor goedgekeurde tegenbiedingen. ' +
    'Bij prijsimpact: geef intel door aan Pricing Agent via delegateToAgent.',
  supportedIntents: ['NEGOTIATION_STATUS', 'NEGOTIATION_RESPOND', 'NEGOTIATION_LIST'],
  allowedTools: [
    'recall_memory',
    'listActiveNegotiations',
    'getNegotiationDetail',
    'proposeCounterOffer',
    'createInsight',
    'delegateToAgent',
  ],
  memoryNamespace: NEGOTIATION_AGENT_KEY,
  canDelegateTo: ['pricing'],
  keywordPatterns: [
    /\b(negotiat\w*|onderhandel\w*|counter.?offer|agentic)\b/i,
    /\b(bied\w*|offer).*(prijs|price)/i,
  ],
};
