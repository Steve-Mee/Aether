import {
  CROSS_DOMAIN_INVENTORY_PRICING_PATTERN,
  CROSS_DOMAIN_PATTERN,
  INVENTORY_KEYWORD_PATTERN,
  PRICING_KEYWORD_PATTERN,
  PROMOTION_CLEARANCE_PATTERN,
  PROMOTION_KEYWORD_PATTERN,
  STOCK_CHECK_PATTERN,
  SUPPLIER_KEYWORD_PATTERN,
} from '../collaborationPatterns';
import type { CollaborationRule } from './collaborationRuleTypes';

export const PRICING_INVENTORY_PROMO_RULES: CollaborationRule[] = [
  {
    id: 'low-stock-to-promotion',
    trigger: {
      intents: ['INVENTORY_STATUS', 'RESTOCK_SUGGEST'],
      commandPattern: PROMOTION_KEYWORD_PATTERN,
    },
    chain: [
      { agentKey: 'inventory', intent: 'INVENTORY_STATUS' },
      { agentKey: 'promotion', intent: 'CLEARANCE_PRICING' },
    ],
    mode: 'sequential',
  },
  {
    id: 'inventory-to-promotion',
    trigger: {
      intents: ['INVENTORY_STATUS'],
      commandPattern: PROMOTION_CLEARANCE_PATTERN,
    },
    chain: [
      { agentKey: 'inventory', intent: 'INVENTORY_STATUS' },
      { agentKey: 'promotion', intent: 'PROMOTION_SUGGEST' },
    ],
    mode: 'sequential',
  },
  {
    id: 'promotion-to-pricing',
    trigger: {
      intents: ['PROMOTION_SUGGEST', 'CLEARANCE_PRICING'],
      commandPattern: PRICING_KEYWORD_PATTERN,
    },
    chain: [
      { agentKey: 'promotion', intent: 'PROMOTION_SUGGEST' },
      { agentKey: 'pricing', intent: 'PRICING_OPTIMIZE' },
    ],
    mode: 'sequential',
  },
  {
    id: 'pricing-to-inventory-check',
    trigger: {
      intents: ['PRICING_OPTIMIZE', 'PRICE_UPDATE'],
      commandPattern: STOCK_CHECK_PATTERN,
    },
    chain: [
      { agentKey: 'pricing', intent: 'PRICING_OPTIMIZE' },
      { agentKey: 'inventory', intent: 'INVENTORY_STATUS' },
    ],
    mode: 'sequential',
  },
  {
    id: 'pricing-needs-supplier',
    trigger: {
      intents: ['PRICE_UPDATE', 'PRICING_OPTIMIZE'],
      commandPattern: SUPPLIER_KEYWORD_PATTERN,
    },
    chain: [{ agentKey: 'supplier', intent: 'SUPPLIER_MONITOR' }],
    mode: 'prepend',
  },
  {
    id: 'pricing-needs-inventory',
    trigger: {
      intents: ['PRICING_OPTIMIZE', 'LOW_MARGIN_REPORT'],
      commandPattern: INVENTORY_KEYWORD_PATTERN,
    },
    chain: [{ agentKey: 'inventory', intent: 'INVENTORY_STATUS' }],
    mode: 'prepend',
  },
  {
    id: 'supplier-to-pricing',
    trigger: {
      intents: ['SUPPLIER_MONITOR', 'SUPPLIER_PRICE_INTEL'],
      commandPattern: PRICING_KEYWORD_PATTERN,
    },
    chain: [
      { agentKey: 'supplier', intent: 'SUPPLIER_PRICE_INTEL' },
      { agentKey: 'pricing', intent: 'PRICING_OPTIMIZE' },
    ],
    mode: 'sequential',
  },
  {
    id: 'inventory-to-pricing',
    trigger: {
      intents: ['INVENTORY_STATUS', 'RESTOCK_SUGGEST'],
      commandPattern: PRICING_KEYWORD_PATTERN,
    },
    chain: [
      { agentKey: 'inventory', intent: 'INVENTORY_STATUS' },
      { agentKey: 'pricing', intent: 'PRICING_OPTIMIZE' },
    ],
    mode: 'sequential',
  },
  {
    id: 'cross-domain-inventory-pricing',
    trigger: {
      commandPattern: CROSS_DOMAIN_INVENTORY_PRICING_PATTERN,
    },
    chain: [
      { agentKey: 'inventory', intent: 'INVENTORY_STATUS' },
      { agentKey: 'pricing', intent: 'PRICING_OPTIMIZE' },
    ],
    mode: 'sequential',
  },
  {
    id: 'cross-domain-single',
    trigger: {
      commandPattern: CROSS_DOMAIN_PATTERN,
    },
    chain: [
      { agentKey: 'supplier', intent: 'SUPPLIER_PRICE_INTEL' },
      { agentKey: 'pricing', intent: 'PRICING_OPTIMIZE' },
    ],
    mode: 'sequential',
  },
];
