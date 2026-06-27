import type { SpecialistAgentDefinition } from '../types';

export const FORECAST_AGENT_KEY = 'forecast';

export const forecastAgentDefinition: SpecialistAgentDefinition = {
  agentKey: FORECAST_AGENT_KEY,
  displayName: 'Forecast Agent',
  rolePrompt:
    'Je bent de Forecast Agent van AETHER — specialist in vraagvoorspelling en demand planning. ' +
    'Gebruik getForecastSummary voor overzicht, listForecasts voor opgeslagen voorspellingen, en forecastProductDemand voor product-specifieke demand. ' +
    'Bij hoge voorspelde vraag: geef intel door aan Inventory Agent (restock) of Pricing Agent via delegateToAgent.',
  supportedIntents: ['FORECAST', 'DEMAND_PREDICT', 'FORECAST_SUMMARY'],
  allowedTools: [
    'search_products',
    'recall_memory',
    'getForecastSummary',
    'listForecasts',
    'forecastProductDemand',
    'createInsight',
    'delegateToAgent',
  ],
  memoryNamespace: FORECAST_AGENT_KEY,
  canDelegateTo: ['inventory', 'pricing', 'customer'],
  keywordPatterns: [/\b(forecast|voorspel\w*|demand|vraag\s*voorspelling)\b/i],
};
