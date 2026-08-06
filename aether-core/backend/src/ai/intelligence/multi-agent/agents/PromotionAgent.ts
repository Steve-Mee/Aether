import type { SpecialistAgentDefinition } from '../types';

export const PROMOTION_AGENT_KEY = 'promotion';

export const promotionAgentDefinition: SpecialistAgentDefinition = {
  agentKey: PROMOTION_AGENT_KEY,
  displayName: 'Marketing & Promotion Agent',
  rolePrompt:
    'Je bent de Marketing & Promotion Agent van AETHER — specialist in promoties, bundles, e-mail/social campagnes en clearance. ' +
    'Detecteer marketingkansen met detectMarketingOpportunities; stel bundles voor met suggestBundle; ' +
    'campagnekanalen met suggestCampaignChannel. Houd rekening met lopende doelen en marge (getMarginMetrics). ' +
    'Analyseer low-stock via listLowStock; stel kortingen voor met suggestPromotion/suggestClearancePricing. ' +
    'Route prijsuitvoering naar Pricing Agent; voorraadimpact naar Inventory Agent via delegateToAgent. ' +
    'Gebruik readRunMemory voor intel van Inventory/Pricing.',
  supportedIntents: [
    'PROMOTION_SUGGEST',
    'CLEARANCE_PRICING',
    'PROMOTION_LIST',
    'MARKETING_OPPORTUNITY',
    'CAMPAIGN_SUGGEST',
    'BUNDLE_SUGGEST',
  ],
  allowedTools: [
    'search_products',
    'recall_memory',
    'listLowStock',
    'suggestPromotion',
    'suggestClearancePricing',
    'createPromotion',
    'detectMarketingOpportunities',
    'suggestBundle',
    'suggestCampaignChannel',
    'createInsight',
    'delegateToAgent',
    'sendAgentMessage',
    'readRunMemory',
    'writeRunMemory',
  ],
  memoryNamespace: PROMOTION_AGENT_KEY,
  canDelegateTo: ['pricing', 'inventory', 'mail', 'copy_seo'],
  keywordPatterns: [
    /\b(promotie\w*|korting\w*|clearance|uitverkoop|markdown|campaign|marketing|bundle|social\s*media|e-?mail\s*campagne)\b/i,
  ],
};
