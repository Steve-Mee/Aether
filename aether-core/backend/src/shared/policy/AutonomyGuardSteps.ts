import type { AutonomyAssessInput, AutonomyAssessmentWithTrace } from './AutonomyPolicyService';
import {
  agentEnabledStep,
  categoryEnabledStep,
  categoryWindowStep,
  globalWindowStep,
  highRiskGuardStep,
  policyEnabledStep,
} from './autonomyGuard/gateSteps';
import {
  autonomyLevelStep,
  customRuleStep,
  marginThresholdStep,
  pricePctThresholdStep,
} from './autonomyGuard/ruleThresholdSteps';
import {
  defaultDenyStep,
  highAutonomyMediumStep,
  lowRiskAutoStep,
  mailMediumOverrideStep,
  priceWithinThresholdStep,
} from './autonomyGuard/allowSteps';
import { buildGuardContext } from './autonomyGuard/helpers';
import type { AutonomyGuardStep } from './autonomyGuard/types';

export type {
  AutonomyGuardContext,
  AutonomyGuardStep,
  AutonomyGuardStepResult,
} from './autonomyGuard/types';

export const AUTONOMY_GUARD_STEPS: readonly AutonomyGuardStep[] = [
  highRiskGuardStep,
  policyEnabledStep,
  categoryEnabledStep,
  agentEnabledStep,
  globalWindowStep,
  categoryWindowStep,
  customRuleStep,
  marginThresholdStep,
  pricePctThresholdStep,
  autonomyLevelStep,
  lowRiskAutoStep,
  mailMediumOverrideStep,
  priceWithinThresholdStep,
  highAutonomyMediumStep,
  defaultDenyStep,
];

export function runAutonomyGuardPipeline(input: AutonomyAssessInput): AutonomyAssessmentWithTrace {
  const ctx = buildGuardContext(input);
  for (const step of AUTONOMY_GUARD_STEPS) {
    const result = step.run(ctx);
    if (result.kind === 'done') {
      return result.assessment;
    }
  }
  const fallback = defaultDenyStep.run(ctx);
  if (fallback.kind === 'done') {
    return fallback.assessment;
  }
  throw new Error('Autonomy guard pipeline reached unreachable fallback');
}
