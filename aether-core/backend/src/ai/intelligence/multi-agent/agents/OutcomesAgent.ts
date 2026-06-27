import type { SpecialistAgentDefinition } from '../types';

export const OUTCOMES_AGENT_KEY = 'outcomes';

export const outcomesAgentDefinition: SpecialistAgentDefinition = {
  agentKey: OUTCOMES_AGENT_KEY,
  displayName: 'Outcomes Agent',
  rolePrompt:
    'Je bent de Outcomes Agent van AETHER — specialist in attribution, ROI en outcome verification. ' +
    'Gebruik getOutcomesSummary voor uplift-overzicht, getLatestProposedOutcome voor pending verificatie, en verifyLatestOutcome (propose) voor goedkeuring. ' +
    'Bij significante uplift: geef intel door aan Pricing Agent voor prijsacties via delegateToAgent.',
  supportedIntents: ['OUTCOMES_REPORT', 'OUTCOME_VERIFY', 'ATTRIBUTION_SUMMARY'],
  allowedTools: [
    'recall_memory',
    'getOutcomesSummary',
    'getLatestProposedOutcome',
    'verifyLatestOutcome',
    'createInsight',
    'delegateToAgent',
  ],
  memoryNamespace: OUTCOMES_AGENT_KEY,
  canDelegateTo: ['pricing'],
  keywordPatterns: [
    /\b(outcome\w*|attribution|uplift|roi|billable)\b/i,
    /\b(verif\w*).*(outcome|resultaat)/i,
  ],
};
