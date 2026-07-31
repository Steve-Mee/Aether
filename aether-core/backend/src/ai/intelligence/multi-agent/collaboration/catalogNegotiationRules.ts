import {
  APPROVAL_KEYWORD_PATTERN,
  CROSS_DOMAIN_CATALOG_PRICING_PATTERN,
  CROSS_DOMAIN_NEGOTIATION_PRICING_PATTERN,
  INVENTORY_KEYWORD_PATTERN,
  PRICING_KEYWORD_PATTERN,
} from '../collaborationPatterns';
import type { CollaborationRule } from './collaborationRuleTypes';

export const CATALOG_NEGOTIATION_RULES: CollaborationRule[] = [
  {
    id: 'negotiation-to-pricing',
    trigger: {
      intents: ['NEGOTIATION_STATUS', 'NEGOTIATION_RESPOND', 'NEGOTIATION_LIST'],
      commandPattern: PRICING_KEYWORD_PATTERN,
    },
    chain: [
      { agentKey: 'negotiation', intent: 'NEGOTIATION_STATUS' },
      { agentKey: 'pricing', intent: 'PRICING_OPTIMIZE' },
    ],
    mode: 'sequential',
  },
  {
    id: 'cross-domain-negotiation-pricing',
    trigger: { commandPattern: CROSS_DOMAIN_NEGOTIATION_PRICING_PATTERN },
    chain: [
      { agentKey: 'negotiation', intent: 'NEGOTIATION_LIST' },
      { agentKey: 'pricing', intent: 'PRICING_OPTIMIZE' },
    ],
    mode: 'sequential',
  },
  {
    id: 'catalog-to-pricing',
    trigger: {
      intents: ['CREATE_PRODUCT', 'PRODUCT_LIST', 'PRODUCT_SEARCH'],
      commandPattern: PRICING_KEYWORD_PATTERN,
    },
    chain: [
      { agentKey: 'catalog', intent: 'PRODUCT_LIST' },
      { agentKey: 'pricing', intent: 'PRICING_OPTIMIZE' },
    ],
    mode: 'sequential',
  },
  {
    id: 'catalog-to-inventory',
    trigger: {
      intents: ['CREATE_PRODUCT', 'PRODUCT_LIST', 'PRODUCT_SEARCH'],
      commandPattern: INVENTORY_KEYWORD_PATTERN,
    },
    chain: [
      { agentKey: 'catalog', intent: 'CREATE_PRODUCT' },
      { agentKey: 'inventory', intent: 'INVENTORY_STATUS' },
    ],
    mode: 'sequential',
  },
  {
    id: 'cross-domain-catalog-pricing',
    trigger: { commandPattern: CROSS_DOMAIN_CATALOG_PRICING_PATTERN },
    chain: [
      { agentKey: 'catalog', intent: 'PRODUCT_SEARCH' },
      { agentKey: 'pricing', intent: 'PRICING_OPTIMIZE' },
    ],
    mode: 'sequential',
  },
  {
    id: 'autonomy-to-approvals',
    trigger: {
      intents: ['AUTONOMOUS_ROUTE', 'DECISION_REVIEW'],
      commandPattern: APPROVAL_KEYWORD_PATTERN,
    },
    chain: [
      { agentKey: 'autonomy', intent: 'DECISION_REVIEW' },
      { agentKey: 'approvals', intent: 'APPROVAL_SUMMARY' },
    ],
    mode: 'sequential',
  },
];
