import type { ActionExecutionMode } from '../actionAutonomy';
import { applyMerchantAutonomy } from '../settings/applyMerchantAutonomy';
import type { MerchantSettings } from '../settings/merchantSettingsTypes';
import type { TodayReadyInsightId } from './types';

const INSIGHT_AUTONOMY_INPUT: Record<
  TodayReadyInsightId,
  { riskBand: 'low' | 'medium' | 'high'; requiresApproval?: boolean; marginImpactEuro?: number }
> = {
  pricing: { riskBand: 'low' },
  supplier: { riskBand: 'low' },
  autonomous: { riskBand: 'low', marginImpactEuro: 870 },
  approvals: { riskBand: 'high', requiresApproval: true },
  margins: { riskBand: 'medium' },
  returns: { riskBand: 'medium' },
  summary: { riskBand: 'low' },
};

export function executionModeForTodayReadyInsight(
  settings: MerchantSettings,
  insightId: TodayReadyInsightId,
): ActionExecutionMode {
  return applyMerchantAutonomy(settings, INSIGHT_AUTONOMY_INPUT[insightId]);
}
