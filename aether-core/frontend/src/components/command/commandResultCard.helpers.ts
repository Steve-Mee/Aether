import { t } from '@/lib/i18n';
import { COMMAND_PREFILL_STORAGE_KEY } from './NaturalLanguageBar';

export const INFORM_ONLY_INTENTS = new Set([
  'MARGIN_INSIGHT',
  'BUSINESS_SUMMARY',
  'INSIGHTS_OVERVIEW',
  'FORECAST',
  'OUTCOMES_REPORT',
  'EMAIL_SUMMARY',
  'LOW_MARGIN_REPORT',
  'INVENTORY_STATUS',
  'ORDER_STATUS',
]);

export function inferRisk(
  confidence: number,
  requiresApproval?: boolean,
): 'low' | 'medium' | 'high' {
  if (resultRequiresApproval(requiresApproval, confidence)) {
    return confidence >= 0.8 ? 'medium' : 'high';
  }
  return confidence >= 0.85 ? 'low' : confidence >= 0.6 ? 'medium' : 'high';
}

export function resultRequiresApproval(requiresApproval?: boolean, confidence?: number): boolean {
  if (requiresApproval != null) return requiresApproval;
  return (confidence ?? 0) < 0.85;
}

export function preparedHeadline(intent: string): string {
  if (intent === 'UNKNOWN' || intent === 'ERROR') {
    return t('command.result.headline.unknown');
  }
  return t('command.result.headline.ready');
}

export function openCommandCenterPrefill(command: string) {
  sessionStorage.setItem(COMMAND_PREFILL_STORAGE_KEY, command);
}
