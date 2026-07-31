import type { SpecialistAgentDefinition } from '../types';

export const STORE_BUILDER_AGENT_KEY = 'store_builder';

export const STORE_BUILDER_SUPPORTED_INTENTS = [
  'STORE_BUILD',
  'STORE_ITERATE',
  'STORE_PUBLISH',
  'STORE_STATUS',
] as const;

export const STORE_BUILDER_ALLOWED_TOOLS = [
  'createSiteProject',
  'createRevisionFromBrief',
  'runBuild',
  'proposePublish',
  'getStoreStatus',
  'recall_memory',
  'createInsight',
  'delegateToAgent',
  'readRunMemory',
  'writeRunMemory',
] as const;

export const storeBuilderAgentDefinition: SpecialistAgentDefinition = {
  agentKey: STORE_BUILDER_AGENT_KEY,
  displayName: 'Store Builder Agent',
  rolePrompt:
    'Je bent de Store Builder Agent van AETHER — orchestrator voor storefront brief → plan → codegen → build → publish-voorstel. ' +
    'Voor STORE_BUILD: delegeer eerst via delegateToAgent naar design (intent DESIGN_PROPOSE) en copy_seo (intent COPY_PROPOSE) met brief in contextPayload; ' +
    'combineer hun layout/tokens/copy tot een SitePlan, maak daarna createSiteProject of createRevisionFromBrief, en runBuild. ' +
    'Voor STORE_PUBLISH: gebruik alleen proposePublish (nooit zelf deployen — human approval verplicht). ' +
    'Voor STORE_STATUS: gebruik getStoreStatus. Schrijf brief/brand inzichten via createInsight / PersonalBrain namespace store_builder. ' +
    'QA: delegeer naar store_qa (intent STORE_QA) vóór publish-voorstellen.',
  supportedIntents: [...STORE_BUILDER_SUPPORTED_INTENTS],
  allowedTools: [...STORE_BUILDER_ALLOWED_TOOLS],
  memoryNamespace: STORE_BUILDER_AGENT_KEY,
  canDelegateTo: ['design', 'copy_seo', 'store_qa'],
  keywordPatterns: [
    /\b(storefront|webshop|website\s*bouw\w*|bouw\s*(een\s+)?(web)?shop|store\s*builder)\b/i,
    /\b(STORE_BUILD|STORE_ITERATE|STORE_PUBLISH|STORE_STATUS)\b/i,
    /\b(publiceer\s*(de\s+)?(web)?shop|publish\s*storefront|preview\s*site)\b/i,
  ],
};
