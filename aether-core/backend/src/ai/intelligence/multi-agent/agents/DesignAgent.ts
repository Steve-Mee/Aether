import type { SpecialistAgentDefinition } from '../types';

export const DESIGN_AGENT_KEY = 'design';

export const DESIGN_SUPPORTED_INTENTS = ['DESIGN_PROPOSE'] as const;

export const DESIGN_ALLOWED_TOOLS = [
  'proposeLayout',
  'proposeTokens',
  'proposePageTree',
  'recall_memory',
  'createInsight',
] as const;

export const designAgentDefinition: SpecialistAgentDefinition = {
  agentKey: DESIGN_AGENT_KEY,
  displayName: 'Design Agent',
  rolePrompt:
    'Je bent de Design Agent van AETHER — specialist in storefront layout, design tokens en allowlisted page trees. ' +
    'Gebruik proposeTokens, proposeLayout en proposePageTree. Genereer alleen allowlisted blocks (Hero, ProductGrid, …). ' +
    'Geen vrije codegen, geen overrides/*.tsx. Bij LLM-onbeschikbaarheid: gebruik deterministische fallback templates.',
  supportedIntents: [...DESIGN_SUPPORTED_INTENTS],
  allowedTools: [...DESIGN_ALLOWED_TOOLS],
  memoryNamespace: DESIGN_AGENT_KEY,
  canDelegateTo: [],
  keywordPatterns: [
    /\b(design\s*tokens?|layout\s*voorstel|page\s*tree|kleurenpalet|typograf\w*)\b/i,
    /\b(DESIGN_PROPOSE)\b/i,
  ],
};
