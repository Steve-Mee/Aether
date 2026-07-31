import { normalizePathname } from './routeResolvers';

/** NL command intent → route mapping */
export const INTENT_ROUTES: Record<string, string> = {
  LOW_MARGIN_REPORT: '/products',
  EMAIL_SUMMARY: '/emails',
  PENDING_APPROVALS: '/workstream',
  SUPPLIER_MONITOR: '/suppliers',
  SUPPLIER_CREATE: '/suppliers',
  INVENTORY_STATUS: '/inventory',
  RESTOCK_SUGGEST: '/inventory',
  PROMOTION_SUGGEST: '/promotions',
  PROMOTION_LIST: '/promotions',
  CLEARANCE_PRICING: '/promotions',
  ORDER_STATUS: '/orders',
  OUTCOMES_REPORT: '/outcomes',
  OUTCOME_VERIFY: '/outcomes',
  APPROVE_CHANGES: '/approvals',
  FORECAST: '/insights',
  PRICE_UPDATE: '/products',
  STORE_BUILD: '/website',
  STORE_ITERATE: '/website/preview',
  STORE_PUBLISH: '/website/publish',
  STORE_STATUS: '/website',
};

export function routeForIntent(intent: string): string | null {
  return INTENT_ROUTES[intent] ?? null;
}

/** Sidecar signal boost per path prefix */
const SIDECAR_BOOST_BY_PATH: Record<string, string> = {
  '/emails': 'mail',
  '/approvals': 'approvals',
  '/products': 'margin',
  '/orders': 'approvals',
  '/customers': 'proactive',
  '/inventory': 'margin',
  '/promotions': 'margin',
  '/payments': 'uplift',
  '/suppliers': 'margin',
  '/outcomes': 'uplift',
  '/autonomous': 'autonomy',
  /** Website publish flows surface approval signals first */
  '/website': 'approvals',
  '/pages': 'approvals',
};

export function resolveSidecarBoostId(pathname: string): string | null {
  const normalized = normalizePathname(pathname);
  const entry = Object.entries(SIDECAR_BOOST_BY_PATH).find(([path]) => normalized.startsWith(path));
  return entry?.[1] ?? null;
}
