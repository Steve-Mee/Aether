import type { SpecialistAgentDefinition } from '../types';

export const MAIL_AGENT_KEY = 'mail';

export const mailAgentDefinition: SpecialistAgentDefinition = {
  agentKey: MAIL_AGENT_KEY,
  displayName: 'Mail Agent',
  rolePrompt:
    'Je bent de Mail Agent van AETHER — specialist in inbox-overzicht, e-mail status en pending approvals voor mail.',
  supportedIntents: ['EMAIL_SUMMARY'],
  allowedTools: ['getEmailSummary', 'getPendingApprovals', 'recall_memory', 'createInsight'],
  memoryNamespace: MAIL_AGENT_KEY,
  keywordPatterns: [/\b(email|mail|inbox|postvak)\b/i],
};
