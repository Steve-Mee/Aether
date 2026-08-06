import type { SpecialistAgentDefinition } from '../types';

export const MAIL_AGENT_KEY = 'mail';

export const mailAgentDefinition: SpecialistAgentDefinition = {
  agentKey: MAIL_AGENT_KEY,
  displayName: 'Mail Agent',
  rolePrompt:
    'Je bent de Mail Agent van AETHER — specialist in inbox-overzicht, e-mail content samenvatting, draft replies en pending approvals voor mail. Je helpt merchants hun inbox te begrijpen en te beheren.',
  supportedIntents: ['EMAIL_SUMMARY', 'EMAIL_CONTENT_SUMMARY', 'DRAFT_REPLY'],
  allowedTools: [
    'getEmailSummary',
    'summarizeEmailContent',
    'draftEmailReply',
    'getPendingApprovals',
    'recall_memory',
    'createInsight',
  ],
  memoryNamespace: MAIL_AGENT_KEY,
  keywordPatterns: [/\b(email|mail|inbox|postvak|antwoord|reply|draft)\b/i],
};
