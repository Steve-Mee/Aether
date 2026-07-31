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
const PROMOTION_INTENTS = new Set(['PROMOTION_SUGGEST', 'CLEARANCE_PRICING', 'PROMOTION_LIST']);
const SUPERVISOR_INTENTS = new Set(['COMPOUND_WORKFLOW', 'PLAN_AND_DELEGATE']);
const AUTONOMY_INTENTS = new Set(['AUTONOMY_METRICS', 'AUTONOMY_TRACE', 'DECISION_REVIEW', 'AUTONOMOUS_ROUTE']);
const STORE_BUILDER_INTENTS = new Set(['STORE_BUILD', 'STORE_ITERATE', 'STORE_PUBLISH', 'STORE_STATUS']);
const DESIGN_INTENTS = new Set(['DESIGN_PROPOSE']);
const COPY_SEO_INTENTS = new Set(['COPY_PROPOSE']);
const STORE_QA_INTENTS = new Set(['STORE_QA']);

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
  'PROMOTION_SUGGEST',
  'CLEARANCE_PRICING',
  'PROMOTION_LIST',
  'CREATE_PRODUCT',
  'PRODUCT_LIST',
  'PRODUCT_SEARCH',
  'AUTONOMY_METRICS',
  'AUTONOMY_TRACE',
  'DECISION_REVIEW',
  'AUTONOMOUS_ROUTE',
  'PLAN_AND_DELEGATE',
  'STORE_BUILD',
  'STORE_ITERATE',
  'STORE_PUBLISH',
  'STORE_STATUS',
  'DESIGN_PROPOSE',
  'COPY_PROPOSE',
  'STORE_QA',
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
    'mail,supplier,pricing,inventory,promotion,customer,forecast,approvals,outcomes,negotiation,catalog,autonomy,store_builder,design,copy_seo,store_qa,workflow_supervisor,admin';
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
}

/** Allowed contextPayload keys per source→target peer pair. */
const PEER_PAYLOAD_SCOPE: Record<string, Record<string, readonly string[]>> = {
  supplier: {
    pricing: ['suggestedPricingActions', 'productId', 'productName', 'action', 'reason', 'changePct', 'supplierId'],
  },
  inventory: {
    pricing: ['lowStockSkus', 'suggestedPricingActions', 'productId', 'productName', 'quantity', 'action', 'reason', 'threshold'],
    promotion: ['lowStockSkus', 'suggestedPricingActions', 'productId', 'reason'],
  },
  promotion: {
    pricing: ['promotionProposals', 'clearanceCandidates', 'productId', 'discountPct', 'markdownPct'],
    inventory: ['productId', 'lowStockSkus'],
  },
  negotiation: {
    pricing: ['negotiationId', 'decision', 'offer', 'counterOffer', 'round'],
  },
  pricing: {
    inventory: ['productId', 'changePct', 'sku', 'productName'],
    supplier: ['productId', 'productName'],
  },
  customer: {
    pricing: ['churnSignals', 'customerSegments', 'demandSignal', 'suggestedActions', 'orderTrends'],
    mail: ['churnSignals', 'customerSegments', 'atRiskCustomers', 'suggestedActions'],
    inventory: ['demandSignal', 'orderTrends', 'growingSegments', 'suggestedActions'],
  },
  store_builder: {
    design: ['brief', 'brandName', 'projectId', 'revisionId', 'path'],
    copy_seo: ['brief', 'brandName', 'projectId', 'revisionId', 'locale', 'copy'],
    store_qa: ['projectId', 'revisionId', 'baseRevisionId', 'targetRevisionId'],
  },
};

export function validatePeerPayloadScope(
  sourceAgentKey: string,
  targetAgentKey: string,
  payload?: Record<string, unknown>
): { ok: boolean; error?: string } {
  if (!payload || Object.keys(payload).length === 0) {
    return { ok: true };
  }

  const allowedKeys = PEER_PAYLOAD_SCOPE[sourceAgentKey]?.[targetAgentKey];
  if (!allowedKeys) {
    return { ok: true };
  }

  const allowedSet = new Set<string>(allowedKeys);
  for (const key of Object.keys(payload)) {
    if (!allowedSet.has(key)) {
      return {
        ok: false,
        error: `Payload key "${key}" is not allowed for ${sourceAgentKey} → ${targetAgentKey} peer messages`,
      };
    }
  }

  return { ok: true };
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
  if (PROMOTION_INTENTS.has(intent) && allowed.has('promotion')) return 'promotion';
  if (CATALOG_INTENTS.has(intent) && allowed.has('catalog')) return 'catalog';
  if (AUTONOMY_INTENTS.has(intent) && allowed.has('autonomy')) return 'autonomy';
  if (STORE_BUILDER_INTENTS.has(intent) && allowed.has('store_builder')) return 'store_builder';
  if (DESIGN_INTENTS.has(intent) && allowed.has('design')) return 'design';
  if (COPY_SEO_INTENTS.has(intent) && allowed.has('copy_seo')) return 'copy_seo';
  if (STORE_QA_INTENTS.has(intent) && allowed.has('store_qa')) return 'store_qa';
  if (SUPERVISOR_INTENTS.has(intent) && allowed.has('workflow_supervisor')) return 'workflow_supervisor';
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
