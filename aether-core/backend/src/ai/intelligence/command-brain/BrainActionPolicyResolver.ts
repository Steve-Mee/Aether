import type { MerchantSettings } from '../../../shared/settings/merchantSettingsTypes';

export type BrainActionMode = 'always_confirm' | 'confirm_on_uncertain' | 'adaptive';
export type LearnedPreferenceHint = 'prefer_confirm' | 'prefer_auto' | null;

const MUTATING_INTENTS = new Set([
  'PRICE_UPDATE',
  'SUPPLIER_CREATE',
  'SUPPLIER_MONITOR',
  'RESTOCK_SUGGEST',
  'APPROVE_CHANGES',
  'OUTCOME_VERIFY',
]);

const CONFIDENCE_THRESHOLD = 0.85;

export function isMutatingIntent(intent: string): boolean {
  return MUTATING_INTENTS.has(intent);
}

export function shouldDeferToTools(input: {
  settings: MerchantSettings;
  intent: string;
  confidence: number;
  learnedHint?: LearnedPreferenceHint;
}): boolean {
  const mode = input.settings.brainActionMode ?? 'confirm_on_uncertain';

  if (!isMutatingIntent(input.intent)) {
    return mode === 'always_confirm';
  }

  if (mode === 'always_confirm') {
    return true;
  }

  if (mode === 'confirm_on_uncertain') {
    return (
      input.confidence < CONFIDENCE_THRESHOLD ||
      input.intent === 'UNKNOWN' ||
      input.intent === 'ERROR'
    );
  }

  // adaptive: defer when uncertain OR learned preference says confirm
  if (input.confidence < CONFIDENCE_THRESHOLD || input.intent === 'UNKNOWN') {
    return true;
  }
  if (input.learnedHint === 'prefer_confirm') {
    return true;
  }
  if (input.learnedHint === 'prefer_auto' && input.confidence >= CONFIDENCE_THRESHOLD) {
    return false;
  }
  return false;
}

export function shouldUseAgentLoop(parsedIntent: string, deferToTools: boolean): boolean {
  if (deferToTools) return true;
  return ['PRICE_UPDATE', 'LOW_MARGIN_REPORT', 'UNKNOWN'].includes(parsedIntent);
}
