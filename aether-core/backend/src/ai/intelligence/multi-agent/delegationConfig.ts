import { DEFAULT_BRAIN_AGENT_KEY } from '../global-knowledge/constants';

const MAIL_INTENTS = new Set(['EMAIL_SUMMARY']);
const SUPPLIER_INTENTS = new Set(['SUPPLIER_MONITOR', 'SUPPLIER_CREATE', 'SUPPLIER_PRICE_INTEL']);
const PRICING_INTENTS = new Set(['PRICE_UPDATE', 'LOW_MARGIN_REPORT', 'PRICING_OPTIMIZE']);
const INVENTORY_INTENTS = new Set(['INVENTORY_STATUS', 'RESTOCK_SUGGEST']);
const CUSTOMER_INTENTS = new Set([
  'CUSTOMER_SEGMENT',
  'CUSTOMER_ORDER_TRENDS',
  'CUSTOMER_CHURN_SIGNALS',
  'ORDER_STATUS',
]);
const FORECAST_INTENTS = new Set(['FORECAST', 'DEMAND_PREDICT', 'FORECAST_SUMMARY']);
const APPROVAL_INTENTS = new Set(['PENDING_APPROVALS', 'APPROVE_CHANGES', 'APPROVAL_SUMMARY']);
const OUTCOMES_INTENTS = new Set(['OUTCOMES_REPORT', 'OUTCOME_VERIFY', 'ATTRIBUTION_SUMMARY']);
const NEGOTIATION_INTENTS = new Set(['NEGOTIATION_STATUS', 'NEGOTIATION_RESPOND', 'NEGOTIATION_LIST']);
const CATALOG_INTENTS = new Set(['CREATE_PRODUCT', 'PRODUCT_LIST', 'PRODUCT_SEARCH']);
const AUTONOMY_INTENTS = new Set(['AUTONOMY_METRICS', 'AUTONOMY_TRACE', 'DECISION_REVIEW', 'AUTONOMOUS_ROUTE']);

export const SPECIALIST_HANDLED_INTENTS = new Set([
  'PRICE_UPDATE',
  'LOW_MARGIN_REPORT',
  'PRICING_OPTIMIZE',
  'SUPPLIER_MONITOR',
  'SUPPLIER_CREATE',
  'SUPPLIER_PRICE_INTEL',
  'INVENTORY_STATUS',
  'RESTOCK_SUGGEST',
  'EMAIL_SUMMARY',
  'CUSTOMER_SEGMENT',
  'CUSTOMER_ORDER_TRENDS',
  'CUSTOMER_CHURN_SIGNALS',
  'ORDER_STATUS',
  'FORECAST',
  'DEMAND_PREDICT',
  'FORECAST_SUMMARY',
  'PENDING_APPROVALS',
  'APPROVE_CHANGES',
  'APPROVAL_SUMMARY',
  'OUTCOMES_REPORT',
  'OUTCOME_VERIFY',
  'ATTRIBUTION_SUMMARY',
  'NEGOTIATION_STATUS',
  'NEGOTIATION_RESPOND',
  'NEGOTIATION_LIST',
  'CREATE_PRODUCT',
  'PRODUCT_LIST',
  'PRODUCT_SEARCH',
  'AUTONOMY_METRICS',
  'AUTONOMY_TRACE',
  'DECISION_REVIEW',
  'AUTONOMOUS_ROUTE',
]);

export function isMultiAgentDelegationEnabled(): boolean {
  if (process.env.MULTI_AGENT_DELEGATION_ENABLED === 'false') return false;
  if (process.env.NODE_ENV === 'production' && process.env.MULTI_AGENT_DELEGATION_ENABLED !== 'true') {
    return false;
  }
  return true;
}

export function getAllowedDelegationTargets(): Set<string> {
  const raw =
    process.env.MULTI_AGENT_ALLOWED_TARGETS ??
    'mail,supplier,pricing,inventory,customer,forecast,approvals,outcomes,negotiation,catalog,autonomy,admin';
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
}

export function resolveDelegationTarget(intent: string): string | null {
  if (!isMultiAgentDelegationEnabled()) return null;

  const allowed = getAllowedDelegationTargets();
  if (MAIL_INTENTS.has(intent) && allowed.has('mail')) return 'mail';
  if (SUPPLIER_INTENTS.has(intent) && allowed.has('supplier')) return 'supplier';
  if (PRICING_INTENTS.has(intent) && allowed.has('pricing')) return 'pricing';
  if (INVENTORY_INTENTS.has(intent) && allowed.has('inventory')) return 'inventory';
  if (CUSTOMER_INTENTS.has(intent) && allowed.has('customer')) return 'customer';
  if (FORECAST_INTENTS.has(intent) && allowed.has('forecast')) return 'forecast';
  if (APPROVAL_INTENTS.has(intent) && allowed.has('approvals')) return 'approvals';
  if (OUTCOMES_INTENTS.has(intent) && allowed.has('outcomes')) return 'outcomes';
  if (NEGOTIATION_INTENTS.has(intent) && allowed.has('negotiation')) return 'negotiation';
  if (CATALOG_INTENTS.has(intent) && allowed.has('catalog')) return 'catalog';
  if (AUTONOMY_INTENTS.has(intent) && allowed.has('autonomy')) return 'autonomy';
  return null;
}

export function shouldSkipHandlerForSpecialist(intent: string, specialistActive: boolean): boolean {
  if (!specialistActive) return false;
  return SPECIALIST_HANDLED_INTENTS.has(intent);
}

export function shouldDelegateFromAdmin(intent: string, agentKey?: string): boolean {
  if (agentKey && agentKey !== DEFAULT_BRAIN_AGENT_KEY) return false;
  return resolveDelegationTarget(intent) !== null;
}
