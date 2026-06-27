import type { SpecialistAgentDefinition } from '../types';

export const WORKFLOW_SUPERVISOR_KEY = 'workflow_supervisor';

export const WORKFLOW_SUPERVISOR_INTENTS = ['COMPOUND_WORKFLOW', 'PLAN_AND_DELEGATE'] as const;

export const workflowSupervisorDefinition: SpecialistAgentDefinition = {
  agentKey: WORKFLOW_SUPERVISOR_KEY,
  displayName: 'Workflow Supervisor',
  rolePrompt:
    'Je bent de Workflow Supervisor — plant sub-workflows, delegeert naar specialist agents, ' +
    'en coördineert compound taken. Gebruik delegateToAgent voor handoffs en volg het plan stap voor stap.',
  supportedIntents: [...WORKFLOW_SUPERVISOR_INTENTS],
  allowedTools: ['delegateToAgent', 'delegateToAgentAsync', 'recall_memory', 'createInsight'],
  memoryNamespace: WORKFLOW_SUPERVISOR_KEY,
  canDelegateTo: ['pricing', 'inventory', 'supplier', 'mail'],
  keywordPatterns: [/\b(workflow|compound|sub.?workflow|plan and delegate)\b/i],
};
