import type { AgentRegistry } from './AgentRegistry';
import { classifyMultiAgentMode } from './ExecutionModeClassifier';
import { isMutatingIntent } from '../command-brain/BrainActionPolicyResolver';
import type { AutonomyPrefs } from '../../../shared/settings/autonomyTypes';
import { getAgentPriority } from '../../../shared/settings/autonomyTypes';
import type { CollaborationChain, CollaborationChainStep, ExecutionPlan } from './types';

export type { CollaborationChain, CollaborationChainStep };

interface CollaborationRule {
  id: string;
  trigger: {
    intents?: string[];
    excludeIntents?: string[];
    commandPattern?: RegExp;
    requireKeywordAgents?: string[];
  };
  chain: CollaborationChainStep[];
  mode: 'prepend' | 'sequential' | 'parallel';
}

const SUPPLIER_KEYWORD_PATTERN =
  /\b(leverancier|supplier|leveranciers|inkoop|inkoopprijs|inkoopkosten|cost\s*price|purchase)\b/i;

const PRICING_KEYWORD_PATTERN =
  /\b(prij\w*|price\w*|marge|margin|optimaliseer|optimize)\b/i;

const CROSS_DOMAIN_PATTERN =
  /(?=.*(?:leverancier|supplier|inkoop|inkoopprijs|inkoopkosten))(?=.*(?:prijs|price|marge|margin|prijsaanpassing|optimaliseer))/i;

const INVENTORY_KEYWORD_PATTERN =
  /\b(voorraad\w*|stock\w*|inventory|low.?stock|restock|magazijn)\b/i;

const CROSS_DOMAIN_INVENTORY_PRICING_PATTERN =
  /(?=.*(?:voorraad|stock|inventory|restock|magazijn))(?=.*(?:prijs|price|marge|margin|optimaliseer))/i;

const MAIL_KEYWORD_PATTERN = /\b(email|mail|inbox|postvak)\b/i;

const CROSS_DOMAIN_CUSTOMER_PRICING_PATTERN =
  /(?=.*(?:klant\w*|customer\w*|segment\w*|churn|bestelling\w*|order\s*trend))(?=.*(?:prijs|price|marge|margin|optimaliseer))/i;

const CROSS_DOMAIN_CUSTOMER_MAIL_PATTERN =
  /(?=.*(?:klant\w*|customer\w*|segment\w*|churn))(?=.*(?:email|mail|inbox|postvak))/i;

const CROSS_DOMAIN_CUSTOMER_INVENTORY_PATTERN =
  /(?=.*(?:klant\w*|customer\w*|segment\w*|bestelling\w*|order\s*trend))(?=.*(?:voorraad|stock|inventory|restock|magazijn))/i;

const CROSS_DOMAIN_FORECAST_INVENTORY_PATTERN =
  /(?=.*(?:forecast|voorspel\w*|demand))(?=.*(?:voorraad|stock|inventory|restock|magazijn))/i;

const CROSS_DOMAIN_FORECAST_PRICING_PATTERN =
  /(?=.*(?:forecast|voorspel\w*|demand))(?=.*(?:prijs|price|marge|margin|optimaliseer))/i;

const CROSS_DOMAIN_ORDER_INVENTORY_PATTERN =
  /(?=.*(?:order|bestelling).*(?:status|overzicht))(?=.*(?:voorraad|stock|inventory))/i;

const CROSS_DOMAIN_OUTCOMES_PRICING_PATTERN =
  /(?=.*(?:outcome\w*|attribution|uplift|roi))(?=.*(?:prijs|price|marge|margin|optimaliseer))/i;

const CROSS_DOMAIN_NEGOTIATION_PRICING_PATTERN =
  /(?=.*(?:negotiat\w*|onderhandel\w*|counter.?offer))(?=.*(?:prijs|price|marge|margin))/i;

const CATALOG_KEYWORD_PATTERN = /\b(product\w*|catalog\w*|catalogus|sku|artikel\w*)\b/i;

const CROSS_DOMAIN_CATALOG_PRICING_PATTERN =
  /(?=.*(?:catalog\w*|catalogus|sku|artikel\w*|nieuw\w*\s+product))(?=.*(?:prijs|price|marge|margin|optimaliseer))(?!.*(?:voorraad|stock|inventory|low.?stock|restock|magazijn))/i;

const MUTATING_INTENTS = new Set(['PRICE_UPDATE', 'RESTOCK_SUGGEST', 'SUPPLIER_CREATE']);

const MUTATING_COMMAND_PATTERN =
  /\b(prijsaanpassing|price\s*update|verhoog|verlaag|restock|bestel|wijzig|pas\s+\w+\s+aan|create\s+supplier)\w*/i;

const DEFAULT_RULES: CollaborationRule[] = [
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
      commandPattern: /\b(approval\w*|goedkeur\w*|high.?risk|high.?impact)\b/i,
    },
    chain: [
      { agentKey: 'autonomy', intent: 'DECISION_REVIEW' },
      { agentKey: 'approvals', intent: 'APPROVAL_SUMMARY' },
    ],
    mode: 'sequential',
  },
  {
    id: 'low-stock-to-promotion',
    trigger: {
      intents: ['INVENTORY_STATUS', 'RESTOCK_SUGGEST'],
      commandPattern: /\b(promotie\w*|korting\w*|clearance|uitverkoop|markdown)\b/i,
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
      commandPattern: /\b(promotie\w*|clearance|uitverkoop)\b/i,
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
      commandPattern: /\b(voorraad\s*check|stock\s*level|verify\s*stock|controleer\s*voorraad)\b/i,
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

function matchesKeywordAgents(
  command: string,
  registry: AgentRegistry,
  requiredAgentKeys: string[]
): boolean {
  const matches = registry.resolveKeywordMatches(command);
  const matchedKeys = new Set(matches.map((m) => m.agentKey));
  return requiredAgentKeys.every((key) => matchedKeys.has(key));
}

export function resolveMultiAgentKeywords(command: string, registry: AgentRegistry): string[] {
  return registry.resolveKeywordMatches(command).map((m) => m.agentKey);
}

export function sortAgentsByAutonomyPriority(
  agentKeys: string[],
  autonomyPrefs: AutonomyPrefs,
): string[] {
  return [...agentKeys].sort(
    (a, b) => getAgentPriority(autonomyPrefs, b) - getAgentPriority(autonomyPrefs, a),
  );
}

export function resolvePrimaryAgentByPriority(
  agentKeys: string[],
  autonomyPrefs: AutonomyPrefs,
): string | null {
  if (agentKeys.length === 0) return null;
  const sorted = sortAgentsByAutonomyPriority(agentKeys, autonomyPrefs);
  return sorted[0] ?? null;
}

export function resolveCollaborationChain(
  command: string,
  intent: string,
  registry: AgentRegistry,
  primaryAgentKey?: string
): CollaborationChain | null {
  for (const rule of DEFAULT_RULES) {
    const { trigger } = rule;

    if (trigger.intents && !trigger.intents.includes(intent)) continue;

    if (trigger.excludeIntents?.includes(intent)) continue;

    if (rule.mode === 'parallel') {
      if (isMutatingIntent(intent)) continue;
      if (MUTATING_COMMAND_PATTERN.test(command)) continue;
      if (classifyMultiAgentMode(rule.chain) === 'sequential') continue;
    }

    if (trigger.commandPattern && !trigger.commandPattern.test(command)) continue;

    if (
      trigger.requireKeywordAgents &&
      !matchesKeywordAgents(command, registry, trigger.requireKeywordAgents)
    ) {
      continue;
    }

    if (rule.mode === 'prepend' && primaryAgentKey) {
      const prependSteps = rule.chain.filter((s) => s.agentKey !== primaryAgentKey);
      if (prependSteps.length === 0) continue;
      return {
        ruleId: rule.id,
        mode: 'prepend',
        steps: prependSteps.map((s) => ({
          ...s,
          command: buildChainCommand(s, command, primaryAgentKey),
        })),
        primaryAgentKey,
      };
    }

    if (rule.mode === 'sequential' || rule.mode === 'parallel') {
      return {
        ruleId: rule.id,
        mode: rule.mode,
        steps: rule.chain.map((s) => ({
          ...s,
          command: buildChainCommand(s, command),
        })),
      };
    }
  }

  return null;
}

function buildChainCommand(
  step: CollaborationChainStep,
  originalCommand: string,
  primaryAgentKey?: string
): string {
  if (step.command) return step.command;
  if (primaryAgentKey) {
    return `${step.intent} context voor ${primaryAgentKey}: ${originalCommand}`;
  }
  return originalCommand;
}

export function detectMultiDomainPlan(
  command: string,
  intent: string,
  registry: AgentRegistry,
  primaryAgentKey?: string
): ExecutionPlan | null {
  const keywordAgents = resolveMultiAgentKeywords(command, registry);
  if (keywordAgents.length < 2) return null;

  let steps = keywordAgents.map((key) => {
    const def = registry.resolveByKey(key);
    const stepIntent =
      key === primaryAgentKey ? intent : (def?.supportedIntents[0] ?? intent);
    return { agentKey: key, intent: stepIntent, command };
  });

  if (primaryAgentKey) {
    steps = [
      ...steps.filter((s) => s.agentKey === primaryAgentKey),
      ...steps.filter((s) => s.agentKey !== primaryAgentKey),
    ];
  }

  const mode = classifyMultiAgentMode(steps);
  return {
    mode,
    agents: steps,
    routingSource: 'keyword',
    routingReason: mode === 'parallel' ? 'multi-domain parallel' : 'multi-domain match',
  };
}

export function collaborationChainToExecutionPlan(chain: CollaborationChain): ExecutionPlan {
  if (chain.mode === 'sequential' || chain.mode === 'parallel') {
    const agents = chain.steps.map((s) => ({
      agentKey: s.agentKey,
      intent: s.intent,
      command: s.command,
    }));
    const mode =
      chain.mode === 'parallel' ? classifyMultiAgentMode(agents) : chain.mode;
    return { mode, agents };
  }

  const primaryKey = chain.primaryAgentKey ?? chain.steps[chain.steps.length - 1]?.agentKey;
  const primaryIntent =
    chain.steps.find((s) => s.agentKey === primaryKey)?.intent ?? chain.steps[0]?.intent ?? 'UNKNOWN';

  return {
    mode: 'single',
    agents: primaryKey
      ? [{ agentKey: primaryKey, intent: primaryIntent }]
      : [],
    collaborationChain: chain,
  };
}

export function needsSupplierIntel(command: string, intent: string): boolean {
  if (intent !== 'PRICE_UPDATE' && intent !== 'PRICING_OPTIMIZE') return false;
  return SUPPLIER_KEYWORD_PATTERN.test(command);
}

export function resolvePrependChainForPrimary(
  command: string,
  intent: string,
  primaryDef: import('./types').SpecialistAgentDefinition,
  registry: AgentRegistry
): CollaborationChain | null {
  return resolveCollaborationChain(command, intent, registry, primaryDef.agentKey);
}
