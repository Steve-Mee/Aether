import {
  CROSS_DOMAIN_CUSTOMER_INVENTORY_PATTERN,
  CROSS_DOMAIN_CUSTOMER_MAIL_PATTERN,
  CROSS_DOMAIN_CUSTOMER_PRICING_PATTERN,
  INVENTORY_KEYWORD_PATTERN,
  MAIL_KEYWORD_PATTERN,
  PRICING_KEYWORD_PATTERN,
} from '../collaborationPatterns';
import type { CollaborationRule } from './collaborationRuleTypes';

export const CUSTOMER_CHAIN_RULES: CollaborationRule[] = [
  {
    id: 'customer-to-pricing',
    trigger: {
      intents: ['CUSTOMER_SEGMENT', 'CUSTOMER_ORDER_TRENDS', 'CUSTOMER_CHURN_SIGNALS'],
      commandPattern: PRICING_KEYWORD_PATTERN,
    },
    chain: [
      { agentKey: 'customer', intent: 'CUSTOMER_ORDER_TRENDS' },
      { agentKey: 'pricing', intent: 'PRICING_OPTIMIZE' },
    ],
    mode: 'sequential',
  },
  {
    id: 'customer-to-mail',
    trigger: {
      intents: ['CUSTOMER_SEGMENT', 'CUSTOMER_ORDER_TRENDS', 'CUSTOMER_CHURN_SIGNALS'],
      commandPattern: MAIL_KEYWORD_PATTERN,
    },
    chain: [
      { agentKey: 'customer', intent: 'CUSTOMER_CHURN_SIGNALS' },
      { agentKey: 'mail', intent: 'EMAIL_SUMMARY' },
    ],
    mode: 'sequential',
  },
  {
    id: 'customer-to-inventory-demand',
    trigger: {
      intents: ['CUSTOMER_SEGMENT', 'CUSTOMER_ORDER_TRENDS', 'CUSTOMER_CHURN_SIGNALS'],
      commandPattern: INVENTORY_KEYWORD_PATTERN,
    },
    chain: [
      { agentKey: 'customer', intent: 'CUSTOMER_ORDER_TRENDS' },
      { agentKey: 'inventory', intent: 'INVENTORY_STATUS' },
    ],
    mode: 'sequential',
  },
  {
    id: 'cross-domain-customer-pricing',
    trigger: {
      commandPattern: CROSS_DOMAIN_CUSTOMER_PRICING_PATTERN,
    },
    chain: [
      { agentKey: 'customer', intent: 'CUSTOMER_ORDER_TRENDS' },
      { agentKey: 'pricing', intent: 'PRICING_OPTIMIZE' },
    ],
    mode: 'sequential',
  },
  {
    id: 'cross-domain-customer-mail',
    trigger: {
      commandPattern: CROSS_DOMAIN_CUSTOMER_MAIL_PATTERN,
    },
    chain: [
      { agentKey: 'customer', intent: 'CUSTOMER_CHURN_SIGNALS' },
      { agentKey: 'mail', intent: 'EMAIL_SUMMARY' },
    ],
    mode: 'sequential',
  },
  {
    id: 'cross-domain-customer-inventory',
    trigger: {
      commandPattern: CROSS_DOMAIN_CUSTOMER_INVENTORY_PATTERN,
    },
    chain: [
      { agentKey: 'customer', intent: 'CUSTOMER_ORDER_TRENDS' },
      { agentKey: 'inventory', intent: 'INVENTORY_STATUS' },
    ],
    mode: 'sequential',
  },
];
