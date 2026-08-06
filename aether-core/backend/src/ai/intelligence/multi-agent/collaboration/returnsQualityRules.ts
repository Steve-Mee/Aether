import {
  INVENTORY_KEYWORD_PATTERN,
  SUPPLIER_KEYWORD_PATTERN,
} from '../collaborationPatterns';
import type { CollaborationRule } from './collaborationRuleTypes';

export const RETURNS_QUALITY_PATTERN =
  /\b(retour\w*|return\w*|refund\w*|kwaliteit|quality|defect\w*|rma)\b/i;

export const RETURNS_QUALITY_RULES: CollaborationRule[] = [
  {
    id: 'returns-to-supplier',
    trigger: {
      intents: ['RETURNS_ANALYSIS', 'QUALITY_SIGNALS', 'RETURNS_REDUCE'],
      commandPattern: SUPPLIER_KEYWORD_PATTERN,
    },
    chain: [
      { agentKey: 'returns', intent: 'QUALITY_SIGNALS' },
      { agentKey: 'supplier', intent: 'SUPPLIER_MONITOR' },
    ],
    mode: 'sequential',
  },
  {
    id: 'returns-to-inventory',
    trigger: {
      intents: ['RETURNS_ANALYSIS', 'RETURNS_REDUCE'],
      commandPattern: INVENTORY_KEYWORD_PATTERN,
    },
    chain: [
      { agentKey: 'returns', intent: 'RETURNS_ANALYSIS' },
      { agentKey: 'inventory', intent: 'INVENTORY_STATUS' },
    ],
    mode: 'sequential',
  },
  {
    id: 'cross-domain-returns-supplier',
    trigger: {
      commandPattern:
        /(?=.*(?:retour\w*|return\w*|refund\w*|kwaliteit|quality))(?=.*(?:leverancier|supplier|inkoop))/i,
    },
    chain: [
      { agentKey: 'returns', intent: 'QUALITY_SIGNALS' },
      { agentKey: 'supplier', intent: 'SUPPLIER_MONITOR' },
    ],
    mode: 'sequential',
  },
];
