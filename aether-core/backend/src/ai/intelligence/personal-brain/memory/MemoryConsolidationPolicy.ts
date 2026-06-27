import { getLongTermTtlDays } from './constants';
import type { MemoryPriority, MemoryRecordInput } from './types';

const MUTATING_INTENTS = new Set([
  'PRICE_UPDATE',
  'COMPOUND_WORKFLOW',
  'APPROVE_CHANGES',
  'CREATE_PRODUCT',
  'SUPPLIER_CREATE',
]);

export interface ConsolidationDecision {
  promote: boolean;
  priority: MemoryPriority;
  expiresAt?: string;
}

export function shouldPromoteToLongTerm(input: MemoryRecordInput): ConsolidationDecision {
  if (!input.success) {
    return { promote: false, priority: 'low' };
  }
  if (input.intent === 'UNKNOWN' || input.intent === 'ERROR') {
    return { promote: false, priority: 'low' };
  }
  if (input.confidence < 0.5) {
    return { promote: false, priority: 'low' };
  }

  const hasMeasurableOutcome =
    input.goalReached === true ||
    (input.verifiedUplift != null && input.verifiedUplift !== 0) ||
    (input.toolsUsed != null && input.toolsUsed >= 2);

  const isMutating = MUTATING_INTENTS.has(input.intent);

  if (!isMutating && !hasMeasurableOutcome) {
    return { promote: false, priority: 'low' };
  }

  let priority: MemoryPriority = 'medium';
  if (input.goalReached === true || (input.verifiedUplift != null && Math.abs(input.verifiedUplift) >= 1)) {
    priority = 'high';
  } else if (isMutating) {
    priority = 'medium';
  } else {
    priority = 'low';
  }

  const expiresAt =
    priority === 'high' ?
      undefined
    : new Date(Date.now() + getLongTermTtlDays() * 24 * 60 * 60 * 1000).toISOString();

  return { promote: true, priority, expiresAt };
}

export function truncateOutcome(text: string, maxLen = 300): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}
