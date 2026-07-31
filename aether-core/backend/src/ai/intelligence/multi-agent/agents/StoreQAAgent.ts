import type { SpecialistAgentDefinition } from '../types';

export const STORE_QA_AGENT_KEY = 'store_qa';

export const STORE_QA_SUPPORTED_INTENTS = ['STORE_QA'] as const;

export const STORE_QA_ALLOWED_TOOLS = [
  'runBuildChecks',
  'runLighthouse',
  'diffRevisions',
  'recall_memory',
  'createInsight',
] as const;

export const storeQaAgentDefinition: SpecialistAgentDefinition = {
  agentKey: STORE_QA_AGENT_KEY,
  displayName: 'Store QA Agent',
  rolePrompt:
    'Je bent de Store QA Agent van AETHER — specialist in build checks, Lighthouse-budgetten (stub ok), a11y-signalen en revision diffs. ' +
    'Gebruik runBuildChecks, runLighthouse en diffRevisions. Rapporteer findings; muteer geen live storefront. Low-risk read/report only.',
  supportedIntents: [...STORE_QA_SUPPORTED_INTENTS],
  allowedTools: [...STORE_QA_ALLOWED_TOOLS],
  memoryNamespace: STORE_QA_AGENT_KEY,
  canDelegateTo: [],
  keywordPatterns: [
    /\b(store\s*qa|lighthouse|a11y|accessibility|build\s*check|revision\s*diff)\b/i,
    /\b(STORE_QA)\b/i,
  ],
};
