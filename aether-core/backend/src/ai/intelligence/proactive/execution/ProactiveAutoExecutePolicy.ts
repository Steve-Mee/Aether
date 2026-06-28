import type { MerchantSettings } from '../../../../shared/settings/merchantSettingsTypes';
import { isAutonomousWindowOpen } from '../../../../shared/settings/merchantSettingsTypes';
import { assessAutonomy } from '../../../../shared/policy/AutonomyPolicyService';
import type { ProactiveSuggestionRecord } from '../ProactiveSuggestionRepository';
import type { ProactiveLearningPreference } from '../learning/ProactiveLearningService';
import { isProactiveAutoExecuteEnabled } from '../proactiveConfig';

export function shouldProactiveAutoExecute(input: {
  settings: MerchantSettings;
  record: ProactiveSuggestionRecord;
  learningPref: ProactiveLearningPreference;
  lastAutoExecuteAt?: Date | null;
  cooldownMs: number;
  conflictGoalIds?: Set<string>;
}): { eligible: boolean; reason: string; reasonCode?: string } {
  const { settings, record, learningPref, lastAutoExecuteAt, cooldownMs, conflictGoalIds } = input;

  if (!isProactiveAutoExecuteEnabled()) {
    return { eligible: false, reason: 'PROACTIVE_AUTO_EXECUTE_ENABLED is off', reasonCode: 'feature_disabled' };
  }
  if (!settings.proactivePrefs.allowAutoExecute) {
    return { eligible: false, reason: 'Merchant has not enabled proactive auto-execute', reasonCode: 'proactive_disabled' };
  }
  if (!settings.policyEnabled || !settings.autoApproveLowRisk) {
    return { eligible: false, reason: 'Tenant policy does not allow low-risk auto-execute', reasonCode: 'policy_disabled' };
  }
  if (!isAutonomousWindowOpen(settings)) {
    return { eligible: false, reason: 'Outside autonomous window', reasonCode: 'outside_window' };
  }
  if (record.riskLevel !== 'low' || record.executionMode !== 'autonomous') {
    return { eligible: false, reason: 'Only low-risk autonomous suggestions qualify', reasonCode: 'risk_not_low' };
  }
  if (record.goalId && !settings.goalPrefs.allowGoalLinkedAutoExecute) {
    return { eligible: false, reason: 'Goal-linked auto-execute is disabled in goal settings', reasonCode: 'goal_auto_disabled' };
  }
  if (
    record.goalId &&
    conflictGoalIds?.has(record.goalId) &&
    record.riskLevel !== 'low'
  ) {
    return { eligible: false, reason: 'Goal is in conflict state', reasonCode: 'goal_conflict' };
  }
  if (learningPref === 'prefer_suppress' || learningPref === 'prefer_confirm') {
    return { eligible: false, reason: 'Learning preference blocks auto-execute', reasonCode: 'learning_blocked' };
  }
  if (lastAutoExecuteAt && Date.now() - lastAutoExecuteAt.getTime() < cooldownMs) {
    return { eligible: false, reason: 'Auto-execute cooldown active', reasonCode: 'cooldown' };
  }

  const assessment = assessAutonomy({
    settings,
    module: 'proactive-brain',
    actionType: record.triggerId,
    triggerId: record.triggerId,
    agentKey: record.agentKey ?? undefined,
    payload: { command: record.command },
    riskClass: 'low',
  });

  if (!assessment.eligible) {
    return {
      eligible: false,
      reason: assessment.reason,
      reasonCode: assessment.reasonCode,
    };
  }

  return { eligible: true, reason: 'Eligible for proactive auto-execute', reasonCode: 'eligible' };
}
