import {
  CROSS_DOMAIN_FORECAST_INVENTORY_PATTERN,
  CROSS_DOMAIN_FORECAST_PRICING_PATTERN,
  CROSS_DOMAIN_ORDER_INVENTORY_PATTERN,
  CROSS_DOMAIN_OUTCOMES_PRICING_PATTERN,
  INVENTORY_KEYWORD_PATTERN,
  MUTATING_INTENTS,
  PRICING_KEYWORD_PATTERN,
} from '../collaborationPatterns';
import type { CollaborationRule } from './collaborationRuleTypes';

/** Includes parallel-intel-forecast-customer to preserve original first-match order. */
export const FORECAST_OUTCOMES_RULES: CollaborationRule[] = [
  {
    id: 'parallel-intel-forecast-customer',
    trigger: {
      requireKeywordAgents: ['forecast', 'customer'],
      excludeIntents: [...MUTATING_INTENTS],
    },
    chain: [
      { agentKey: 'forecast', intent: 'FORECAST_SUMMARY' },
      { agentKey: 'customer', intent: 'CUSTOMER_ORDER_TRENDS' },
    ],
    mode: 'parallel',
  },
  {
    id: 'forecast-to-inventory',
    trigger: {
      intents: ['FORECAST', 'DEMAND_PREDICT', 'FORECAST_SUMMARY'],
      commandPattern: INVENTORY_KEYWORD_PATTERN,
    },
    chain: [
      { agentKey: 'forecast', intent: 'FORECAST_SUMMARY' },
      { agentKey: 'inventory', intent: 'INVENTORY_STATUS' },
    ],
    mode: 'sequential',
  },
  {
    id: 'forecast-to-pricing',
    trigger: {
      intents: ['FORECAST', 'DEMAND_PREDICT', 'FORECAST_SUMMARY'],
      commandPattern: PRICING_KEYWORD_PATTERN,
    },
    chain: [
      { agentKey: 'forecast', intent: 'DEMAND_PREDICT' },
      { agentKey: 'pricing', intent: 'PRICING_OPTIMIZE' },
    ],
    mode: 'sequential',
  },
  {
    id: 'cross-domain-forecast-inventory',
    trigger: { commandPattern: CROSS_DOMAIN_FORECAST_INVENTORY_PATTERN },
    chain: [
      { agentKey: 'forecast', intent: 'FORECAST_SUMMARY' },
      { agentKey: 'inventory', intent: 'RESTOCK_SUGGEST' },
    ],
    mode: 'sequential',
  },
  {
    id: 'cross-domain-forecast-pricing',
    trigger: { commandPattern: CROSS_DOMAIN_FORECAST_PRICING_PATTERN },
    chain: [
      { agentKey: 'forecast', intent: 'DEMAND_PREDICT' },
      { agentKey: 'pricing', intent: 'PRICING_OPTIMIZE' },
    ],
    mode: 'sequential',
  },
  {
    id: 'cross-domain-order-inventory',
    trigger: { commandPattern: CROSS_DOMAIN_ORDER_INVENTORY_PATTERN },
    chain: [
      { agentKey: 'customer', intent: 'ORDER_STATUS' },
      { agentKey: 'inventory', intent: 'INVENTORY_STATUS' },
    ],
    mode: 'sequential',
  },
  {
    id: 'outcomes-to-pricing',
    trigger: {
      intents: ['OUTCOMES_REPORT', 'OUTCOME_VERIFY', 'ATTRIBUTION_SUMMARY'],
      commandPattern: PRICING_KEYWORD_PATTERN,
    },
    chain: [
      { agentKey: 'outcomes', intent: 'OUTCOMES_REPORT' },
      { agentKey: 'pricing', intent: 'PRICING_OPTIMIZE' },
    ],
    mode: 'sequential',
  },
  {
    id: 'cross-domain-outcomes-pricing',
    trigger: { commandPattern: CROSS_DOMAIN_OUTCOMES_PRICING_PATTERN },
    chain: [
      { agentKey: 'outcomes', intent: 'ATTRIBUTION_SUMMARY' },
      { agentKey: 'pricing', intent: 'PRICING_OPTIMIZE' },
    ],
    mode: 'sequential',
  },
];
