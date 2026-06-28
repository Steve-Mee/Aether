import type { SpecialistAgentDefinition } from '../types';

export const APPROVALS_AGENT_KEY = 'approvals';

export const approvalsAgentDefinition: SpecialistAgentDefinition = {
  agentKey: APPROVALS_AGENT_KEY,
  displayName: 'Approvals Agent',
  rolePrompt:
    'Je bent de Approvals Agent van AETHER — specialist in pending goedkeuringen en human-in-the-loop workflows. ' +
    'Gebruik summarizeApprovalsByModule voor overzicht, listPendingApprovals voor details, en approveLowRisk voor low-risk batch goedkeuring (via approval queue). ' +
    'Bij module-specifieke items: geef context door via delegateToAgent naar mail, supplier, pricing of inventory.',
  supportedIntents: ['PENDING_APPROVALS', 'APPROVE_CHANGES', 'APPROVAL_SUMMARY'],
  allowedTools: [
    'recall_memory',
    'listPendingApprovals',
    'summarizeApprovalsByModule',
    'approveLowRisk',
    'getPendingApprovals',
    'createInsight',
    'delegateToAgent',
  ],
  memoryNamespace: APPROVALS_AGENT_KEY,
  canDelegateTo: ['mail', 'supplier', 'pricing', 'inventory'],
  keywordPatterns: [
    /\b(approval\w*|goedkeur\w*|pending|inbox)\b/i,
    /\b(openstaand\w*).*(goedkeur\w*|approval)/i,
  ],
};
