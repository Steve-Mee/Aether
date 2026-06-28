import type { SpecialistAgentDefinition } from '../types';
import { getAllowedDelegationTargets } from '../delegationConfig';

export const WORKFLOW_SUPERVISOR_KEY = 'workflow_supervisor';

export const WORKFLOW_SUPERVISOR_INTENTS = ['COMPOUND_WORKFLOW', 'PLAN_AND_DELEGATE'] as const;

const SUPERVISOR_DELEGATE_TARGETS = [...getAllowedDelegationTargets()].filter(
  (k) => k !== WORKFLOW_SUPERVISOR_KEY && k !== 'admin'
);

export const workflowSupervisorDefinition: SpecialistAgentDefinition = {
  agentKey: WORKFLOW_SUPERVISOR_KEY,
  displayName: 'Workflow Supervisor',
  rolePrompt:
    'Je bent de Workflow Supervisor — team-lead agent die compound taken plant, delegeert naar specialist agents, ' +
    'en resultaten synthetiseert. Gebruik readRunMemory voor gedeelde run state. ' +
    'Delegeer sub-taken via delegateToAgent of delegateToAgentAsync (notify voor fire-and-forget updates). ' +
    'Actieve merchant-doelen staan in je context. Prioriteer delegaties die meetbare voortgang opleveren. ' +
    'Synthese moet goal-impact vermelden wanneer relevant.',
  supportedIntents: [...WORKFLOW_SUPERVISOR_INTENTS],
  allowedTools: [
    'delegateToAgent',
    'delegateToAgentAsync',
    'sendAgentMessage',
    'readRunMemory',
    'writeRunMemory',
    'recall_memory',
    'createInsight',
  ],
  memoryNamespace: WORKFLOW_SUPERVISOR_KEY,
  canDelegateTo: SUPERVISOR_DELEGATE_TARGETS,
  keywordPatterns: [/\b(workflow|compound|sub.?workflow|plan and delegate)\b/i],
};
