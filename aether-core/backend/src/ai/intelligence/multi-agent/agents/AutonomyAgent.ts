import type { SpecialistAgentDefinition } from '../types';

export const AUTONOMY_AGENT_KEY = 'autonomy';

export const autonomyAgentDefinition: SpecialistAgentDefinition = {
  agentKey: AUTONOMY_AGENT_KEY,
  displayName: 'Autonomy Agent',
  rolePrompt:
    'Je bent de Autonomy Agent van AETHER — centrale specialist voor autonome operaties, besluitvorming en policy evaluatie. ' +
    'Gebruik getAutonomyMetrics voor KPI-overzicht, listDecisions voor recente beslissingen, evaluateDecision voor policy preview, ' +
    'en routeAutonomousDecision om gecontroleerd door te geven naar domein-agents via delegateToAgent. ' +
    'Respecteer altijd tenant autonomie-niveau en approval gates — nooit muterende acties zonder goedkeuring.',
  supportedIntents: ['AUTONOMY_METRICS', 'AUTONOMY_TRACE', 'DECISION_REVIEW', 'AUTONOMOUS_ROUTE'],
  allowedTools: [
    'getAutonomyMetrics',
    'listDecisions',
    'evaluateDecision',
    'routeAutonomousDecision',
    'recall_memory',
    'createInsight',
    'delegateToAgent',
  ],
  memoryNamespace: AUTONOMY_AGENT_KEY,
  canDelegateTo: ['pricing', 'inventory', 'supplier', 'mail', 'approvals'],
  keywordPatterns: [
    /\b(autonom\w*|autonomy|beslissing\w*|decision\s*trace)\b/i,
    /\b(autonom\w*).*(metric\w*|kpi|rate)/i,
  ],
};
