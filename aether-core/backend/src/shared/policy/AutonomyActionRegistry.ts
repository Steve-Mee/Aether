import type { RiskClass } from '../../ai/orchestrator/WorkflowEngine';
import type { AutonomyActionCategory } from '../settings/autonomyTypes';

export interface AutonomyActionMapping {
  category: AutonomyActionCategory;
  defaultRisk: RiskClass;
}

const TOOL_MAPPINGS: Record<string, AutonomyActionMapping> = {
  updatePrice: { category: 'pricing', defaultRisk: 'medium' },
  suggestRestock: { category: 'inventory', defaultRisk: 'medium' },
  syncSupplier: { category: 'supplier', defaultRisk: 'high' },
  createInsight: { category: 'customer', defaultRisk: 'low' },
  createApproval: { category: 'customer', defaultRisk: 'high' },
  search_products: { category: 'customer', defaultRisk: 'low' },
  recall_memory: { category: 'customer', defaultRisk: 'low' },
  getProductInfo: { category: 'customer', defaultRisk: 'low' },
  getPendingApprovals: { category: 'customer', defaultRisk: 'low' },
  executeLowRiskAction: { category: 'customer', defaultRisk: 'low' },
};

const ACTION_MAPPINGS: Record<string, AutonomyActionMapping> = {
  'price.change': { category: 'pricing', defaultRisk: 'medium' },
  'email.auto_reply': { category: 'mail', defaultRisk: 'medium' },
  'supplier.monitor': { category: 'supplier', defaultRisk: 'medium' },
  'supplier.bulk_sync': { category: 'supplier', defaultRisk: 'high' },
  'payment.refund': { category: 'customer', defaultRisk: 'high' },
  'negotiation.counter': { category: 'negotiation', defaultRisk: 'medium' },
  'brain.createInsight': { category: 'customer', defaultRisk: 'low' },
  'brain.recall': { category: 'customer', defaultRisk: 'low' },
  'promotion.suggest': { category: 'promotion', defaultRisk: 'medium' },
  'promotion.clearance': { category: 'promotion', defaultRisk: 'medium' },
};

const INTENT_MAPPINGS: Record<string, AutonomyActionMapping> = {
  PRICING_OPTIMIZE: { category: 'pricing', defaultRisk: 'medium' },
  PRICE_UPDATE: { category: 'pricing', defaultRisk: 'medium' },
  LOW_MARGIN_REPORT: { category: 'pricing', defaultRisk: 'low' },
  SUPPLIER_MONITOR: { category: 'supplier', defaultRisk: 'medium' },
  SUPPLIER_CREATE: { category: 'supplier', defaultRisk: 'high' },
  SUPPLIER_PRICE_INTEL: { category: 'supplier', defaultRisk: 'low' },
  INVENTORY_STATUS: { category: 'inventory', defaultRisk: 'low' },
  RESTOCK_SUGGEST: { category: 'inventory', defaultRisk: 'medium' },
  EMAIL_SUMMARY: { category: 'mail', defaultRisk: 'low' },
  PROMOTION_SUGGEST: { category: 'promotion', defaultRisk: 'medium' },
  CLEARANCE_PRICING: { category: 'promotion', defaultRisk: 'medium' },
  PROMOTION_LIST: { category: 'promotion', defaultRisk: 'low' },
  MARKETING_OPPORTUNITY: { category: 'promotion', defaultRisk: 'low' },
  CAMPAIGN_SUGGEST: { category: 'promotion', defaultRisk: 'medium' },
  BUNDLE_SUGGEST: { category: 'promotion', defaultRisk: 'medium' },
  RETURNS_ANALYSIS: { category: 'customer', defaultRisk: 'low' },
  QUALITY_SIGNALS: { category: 'supplier', defaultRisk: 'low' },
  RETURNS_REDUCE: { category: 'customer', defaultRisk: 'medium' },
  NEGOTIATION_STATUS: { category: 'negotiation', defaultRisk: 'low' },
  NEGOTIATION_RESPOND: { category: 'negotiation', defaultRisk: 'medium' },
  NEGOTIATION_LIST: { category: 'negotiation', defaultRisk: 'low' },
  CUSTOMER_SEGMENT: { category: 'customer', defaultRisk: 'low' },
  CUSTOMER_ORDER_TRENDS: { category: 'customer', defaultRisk: 'low' },
  CUSTOMER_CHURN_SIGNALS: { category: 'customer', defaultRisk: 'low' },
  ORDER_STATUS: { category: 'customer', defaultRisk: 'low' },
};

const TRIGGER_MAPPINGS: Record<string, AutonomyActionMapping> = {
  margin_decline: { category: 'pricing', defaultRisk: 'medium' },
  goal_drift: { category: 'pricing', defaultRisk: 'medium' },
  low_stock: { category: 'inventory', defaultRisk: 'low' },
  supplier_price_change: { category: 'supplier', defaultRisk: 'medium' },
  promotion_opportunity: { category: 'promotion', defaultRisk: 'low' },
};

const AGENT_KEY_MAPPINGS: Record<string, AutonomyActionCategory> = {
  pricing: 'pricing',
  supplier: 'supplier',
  inventory: 'inventory',
  promotion: 'promotion',
  returns: 'customer',
  mail: 'mail',
  negotiation: 'negotiation',
  customer: 'customer',
};

export interface ResolveAutonomyCategoryInput {
  module?: string;
  actionType?: string;
  tool?: string;
  intent?: string;
  triggerId?: string;
  agentKey?: string;
}

function mapModuleToAction(module: string, actionType: string): string {
  if (module === 'aether-mail') return 'email.auto_reply';
  if (/price|prijs/.test(actionType)) return 'price.change';
  if (module === 'supplier-intelligence') return 'supplier.monitor';
  if (module === 'payment-fulfillment') return 'payment.refund';
  return actionType;
}

export function resolveAutonomyCategory(
  input: ResolveAutonomyCategoryInput,
): AutonomyActionMapping | null {
  if (input.tool && TOOL_MAPPINGS[input.tool]) {
    return TOOL_MAPPINGS[input.tool];
  }
  if (input.intent && INTENT_MAPPINGS[input.intent]) {
    return INTENT_MAPPINGS[input.intent];
  }
  if (input.triggerId && TRIGGER_MAPPINGS[input.triggerId]) {
    return TRIGGER_MAPPINGS[input.triggerId];
  }
  if (input.agentKey && AGENT_KEY_MAPPINGS[input.agentKey]) {
    return {
      category: AGENT_KEY_MAPPINGS[input.agentKey],
      defaultRisk: 'low',
    };
  }
  const action =
    input.actionType && input.module
      ? mapModuleToAction(input.module, input.actionType)
      : (input.actionType ?? '');
  if (action && ACTION_MAPPINGS[action]) {
    return ACTION_MAPPINGS[action];
  }
  if (/price|prijs/.test(action)) {
    return { category: 'pricing', defaultRisk: 'medium' };
  }
  if (/supplier|leverancier/.test(action)) {
    return { category: 'supplier', defaultRisk: 'medium' };
  }
  if (/inventory|voorraad|stock|restock/.test(action)) {
    return { category: 'inventory', defaultRisk: 'medium' };
  }
  if (/mail|email/.test(action)) {
    return { category: 'mail', defaultRisk: 'medium' };
  }
  if (/promotion|promo/.test(action)) {
    return { category: 'promotion', defaultRisk: 'medium' };
  }
  if (/negotiat/.test(action)) {
    return { category: 'negotiation', defaultRisk: 'medium' };
  }
  return null;
}

export function resolveAutonomyCategoryKey(
  input: ResolveAutonomyCategoryInput,
): AutonomyActionCategory | null {
  return resolveAutonomyCategory(input)?.category ?? null;
}
