import {
  MAIL_KEYWORD_PATTERN,
  MUTATING_INTENTS,
} from '../collaborationPatterns';
import type { CollaborationRule } from './collaborationRuleTypes';

export const PARALLEL_INTEL_RULES: CollaborationRule[] = [
  {
    id: 'parallel-intel-triple',
    trigger: {
      requireKeywordAgents: ['supplier', 'inventory', 'pricing'],
      excludeIntents: [...MUTATING_INTENTS],
    },
    chain: [
      { agentKey: 'supplier', intent: 'SUPPLIER_PRICE_INTEL' },
      { agentKey: 'inventory', intent: 'INVENTORY_STATUS' },
      { agentKey: 'pricing', intent: 'LOW_MARGIN_REPORT' },
    ],
    mode: 'parallel',
  },
  {
    id: 'parallel-intel-supplier-pricing',
    trigger: {
      requireKeywordAgents: ['supplier', 'pricing'],
      excludeIntents: [...MUTATING_INTENTS],
      intents: ['UNKNOWN', 'EMAIL_SUMMARY', 'INVENTORY_STATUS', 'LOW_MARGIN_REPORT'],
    },
    chain: [
      { agentKey: 'supplier', intent: 'SUPPLIER_PRICE_INTEL' },
      { agentKey: 'pricing', intent: 'LOW_MARGIN_REPORT' },
    ],
    mode: 'parallel',
  },
  {
    id: 'parallel-intel-inventory-mail',
    trigger: {
      requireKeywordAgents: ['inventory', 'mail'],
      commandPattern: MAIL_KEYWORD_PATTERN,
      excludeIntents: [...MUTATING_INTENTS],
    },
    chain: [
      { agentKey: 'inventory', intent: 'INVENTORY_STATUS' },
      { agentKey: 'mail', intent: 'EMAIL_SUMMARY' },
    ],
    mode: 'parallel',
  },
  {
    id: 'parallel-intel-customer-inventory',
    trigger: {
      requireKeywordAgents: ['customer', 'inventory'],
      excludeIntents: [...MUTATING_INTENTS],
    },
    chain: [
      { agentKey: 'customer', intent: 'CUSTOMER_ORDER_TRENDS' },
      { agentKey: 'inventory', intent: 'INVENTORY_STATUS' },
    ],
    mode: 'parallel',
  },
];
