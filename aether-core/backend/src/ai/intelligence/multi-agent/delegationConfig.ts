import { DEFAULT_BRAIN_AGENT_KEY } from '../global-knowledge/constants';

const MAIL_INTENTS = new Set(['EMAIL_SUMMARY']);
const SUPPLIER_INTENTS = new Set(['SUPPLIER_MONITOR', 'SUPPLIER_CREATE']);
const PRICING_INTENTS = new Set(['PRICE_UPDATE', 'LOW_MARGIN_REPORT', 'PRICING_OPTIMIZE']);
const INVENTORY_INTENTS = new Set(['INVENTORY_STATUS', 'RESTOCK_SUGGEST']);

export const SPECIALIST_HANDLED_INTENTS = new Set([
  'PRICE_UPDATE',
  'LOW_MARGIN_REPORT',
  'PRICING_OPTIMIZE',
  'SUPPLIER_MONITOR',
  'SUPPLIER_CREATE',
  'INVENTORY_STATUS',
  'RESTOCK_SUGGEST',
  'EMAIL_SUMMARY',
]);

export function isMultiAgentDelegationEnabled(): boolean {
  if (process.env.MULTI_AGENT_DELEGATION_ENABLED === 'false') return false;
  if (process.env.NODE_ENV === 'production' && process.env.MULTI_AGENT_DELEGATION_ENABLED !== 'true') {
    return false;
  }
  return true;
}

export function getAllowedDelegationTargets(): Set<string> {
  const raw = process.env.MULTI_AGENT_ALLOWED_TARGETS ?? 'mail,supplier,pricing,inventory,admin';
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
}

export function resolveDelegationTarget(intent: string): string | null {
  if (!isMultiAgentDelegationEnabled()) return null;

  const allowed = getAllowedDelegationTargets();
  if (MAIL_INTENTS.has(intent) && allowed.has('mail')) return 'mail';
  if (SUPPLIER_INTENTS.has(intent) && allowed.has('supplier')) return 'supplier';
  if (PRICING_INTENTS.has(intent) && allowed.has('pricing')) return 'pricing';
  if (INVENTORY_INTENTS.has(intent) && allowed.has('inventory')) return 'inventory';
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
