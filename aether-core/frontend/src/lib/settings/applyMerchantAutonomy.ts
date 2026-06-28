import type { ActionExecutionMode, ActionAutonomyInput } from '../actionAutonomy';
import { resolveExecutionMode } from '../actionAutonomy';
import type { AutonomyActionCategory } from './autonomyTypes';
import type { MerchantSettings } from './merchantSettingsTypes';
import { isAutonomousWindowOpen } from './merchantSettingsTypes';

export interface MerchantAutonomyInput extends ActionAutonomyInput {
  marginImpactEuro?: number;
  category?: AutonomyActionCategory | null;
}

export function applyMerchantAutonomy(
  settings: MerchantSettings,
  input: MerchantAutonomyInput,
  now?: Date,
): ActionExecutionMode {
  if (!settings.policyEnabled) {
    return 'approval_required';
  }

  let mode = resolveExecutionMode(input);

  if (input.marginImpactEuro != null && input.marginImpactEuro > settings.maxMarginImpactEuro) {
    return 'approval_required';
  }

  if (input.category) {
    const catPolicy = settings.autonomyPrefs.actionCategories[input.category];
    if (catPolicy && !catPolicy.enabled) {
      return 'approval_required';
    }
    if (catPolicy && input.riskBand === 'low' && !catPolicy.allowLowRiskAutoExecute) {
      mode = 'approval_required';
    }
    if (catPolicy && input.riskBand === 'medium' && !catPolicy.allowMediumRiskAutoExecute) {
      mode = 'approval_required';
    }
  }

  if (mode === 'autonomous' && !settings.autoApproveLowRisk) {
    mode = 'approval_required';
  }

  if (settings.autonomyLevel === 'low') {
    if (input.riskBand === 'medium' || input.requiresApproval) {
      mode = 'approval_required';
    } else if (mode === 'autonomous') {
      mode = 'inform_only';
    }
  }

  if (settings.autonomyLevel === 'high' && input.riskBand === 'medium' && !input.requiresApproval) {
    if (settings.autoApproveLowRisk) {
      mode = 'autonomous';
    }
  }

  if (mode === 'autonomous' && !isAutonomousWindowOpen(settings, now)) {
    return 'inform_only';
  }

  return mode;
}

export function resolveMerchantExecutionMode(
  settings: MerchantSettings,
  input: MerchantAutonomyInput,
  now?: Date,
): ActionExecutionMode {
  return applyMerchantAutonomy(settings, input, now);
}

export function resolveMerchantExecutionModeFromResult(
  settings: MerchantSettings,
  result: { requiresApproval?: boolean; riskBand?: 'low' | 'medium' | 'high' },
  now?: Date,
): ActionExecutionMode {
  return applyMerchantAutonomy(
    settings,
    {
      requiresApproval: result.requiresApproval,
      riskBand: result.riskBand,
    },
    now,
  );
}

export function applyMerchantAutonomyFromSuggestion(
  settings: MerchantSettings,
  suggestion: { executionMode: ActionExecutionMode; intentId: string; impactHint?: string },
): ActionExecutionMode {
  const riskBand =
    suggestion.executionMode === 'approval_required'
      ? 'high'
      : suggestion.executionMode === 'inform_only'
        ? 'medium'
        : 'low';

  const marginMatch = suggestion.impactHint?.match(/€([\d.,]+)/);
  const marginImpactEuro = marginMatch
    ? Number(marginMatch[1].replace('.', '').replace(',', '.'))
    : undefined;

  return applyMerchantAutonomy(settings, {
    riskBand: riskBand as 'low' | 'medium' | 'high',
    requiresApproval: suggestion.executionMode === 'approval_required',
    marginImpactEuro,
  });
}
