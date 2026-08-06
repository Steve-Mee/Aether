import type { SpecialistAgentDefinition } from '../types';
import { getAllowedDelegationTargets } from '../delegationConfig';

export const WORKFLOW_SUPERVISOR_KEY = 'workflow_supervisor';

export const WORKFLOW_SUPERVISOR_INTENTS = ['COMPOUND_WORKFLOW', 'PLAN_AND_DELEGATE'] as const;

const SUPERVISOR_DELEGATE_TARGETS = [...getAllowedDelegationTargets()].filter(
  (k) => k !== WORKFLOW_SUPERVISOR_KEY && k !== 'admin'
);

export const workflowSupervisorDefinition: SpecialistAgentDefinition = {
  agentKey: WORKFLOW_SUPERVISOR_KEY,
  displayName: 'Lead Workflow Supervisor',
  rolePrompt:
    'Je bent de Lead Agent / Workflow Supervisor — hiërarchische team-lead boven specialisten. ' +
    'Breek complexe doelen op met planGoalSubtasks; bepaal welke agents wanneer nodig zijn; ' +
    'delegeer via delegateToAgent / delegateToAgentAsync; combineer resultaten met synthesizeAgentResults. ' +
    'Bij grote/high-impact beslissingen: requestHitlGate vóór autonome uitvoering. ' +
    'Gebruik readRunMemory voor gedeelde run state. Actieve merchant-doelen staan in je context. ' +
    'Prioriteer delegaties die meetbare voortgang opleveren; vermeld goal-impact in synthese.',
  supportedIntents: [...WORKFLOW_SUPERVISOR_INTENTS],
  allowedTools: [
    'planGoalSubtasks',
    'synthesizeAgentResults',
    'requestHitlGate',
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
  keywordPatterns: [
    /\b(workflow|compound|sub.?workflow|plan and delegate|lead\s*agent|orkestreer|orchestrat\w*)\b/i,
  ],
};
