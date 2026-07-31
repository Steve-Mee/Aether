import type { SpecialistAgentDefinition } from '../types';

export const COPY_SEO_AGENT_KEY = 'copy_seo';

export const COPY_SEO_SUPPORTED_INTENTS = ['COPY_PROPOSE'] as const;

export const COPY_SEO_ALLOWED_TOOLS = [
  'proposeCopy',
  'proposeMeta',
  'localize',
  'recall_memory',
  'createInsight',
] as const;

export const copySeoAgentDefinition: SpecialistAgentDefinition = {
  agentKey: COPY_SEO_AGENT_KEY,
  displayName: 'Copy & SEO Agent',
  rolePrompt:
    'Je bent de Copy & SEO Agent van AETHER — specialist in microcopy, PDP-teksten, meta titles/descriptions, hreflang en JSON-LD. ' +
    'Gebruik proposeCopy, proposeMeta en localize. Houd toon merkconsistent. Bij LLM-onbeschikbaarheid: deterministische fallback copy.',
  supportedIntents: [...COPY_SEO_SUPPORTED_INTENTS],
  allowedTools: [...COPY_SEO_ALLOWED_TOOLS],
  memoryNamespace: COPY_SEO_AGENT_KEY,
  canDelegateTo: [],
  keywordPatterns: [
    /\b(copy|microcopy|seo|meta\s*title|json-?ld|lokaliseer|localize|hreflang)\b/i,
    /\b(COPY_PROPOSE)\b/i,
  ],
};
