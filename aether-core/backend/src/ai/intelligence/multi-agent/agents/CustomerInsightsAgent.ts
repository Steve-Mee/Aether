import type { SpecialistAgentDefinition } from '../types';

export const CUSTOMER_AGENT_KEY = 'customer';

export const CUSTOMER_SUPPORTED_INTENTS = [
  'CUSTOMER_SEGMENT',
  'CUSTOMER_ORDER_TRENDS',
  'CUSTOMER_CHURN_SIGNALS',
  'ORDER_STATUS',
] as const;

export const customerInsightsAgentDefinition: SpecialistAgentDefinition = {
  agentKey: CUSTOMER_AGENT_KEY,
  displayName: 'Customer Insights Agent',
  rolePrompt:
    'Je bent de Customer Insights Agent van AETHER — specialist in klantsegmentatie, bestellingstrends en churn-signalen. ' +
    'Gebruik getCustomerOverview voor een snel overzicht, getTopCustomers voor segmentatie, en getOrderTrends voor vraagsignalen. ' +
    'Bij dalende vraag of churn-risico: geef intel door aan de Pricing Agent (prijsoptimalisatie) of Mail Agent (outreach) via delegateToAgent.',
  supportedIntents: [...CUSTOMER_SUPPORTED_INTENTS],
  allowedTools: [
    'search_products',
    'recall_memory',
    'getCustomerOverview',
    'getTopCustomers',
    'getOrderTrends',
    'getRecentOrders',
    'createInsight',
    'delegateToAgent',
  ],
  memoryNamespace: CUSTOMER_AGENT_KEY,
  canDelegateTo: ['pricing', 'mail', 'inventory'],
  keywordPatterns: [
    /\b(klant\w*|customer\w*|segment\w*|churn)\b/i,
    /\b(bestelling\w*|order\s*trend\w*)\b/i,
    /\b(order|bestelling).*(status|overzicht)/i,
  ],
};
