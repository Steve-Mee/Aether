import type { ReflectionTrigger, ReflectionTriggerContext } from './types';
import {
  getExperimentReflectionMinTools,
  isExperimentFailureTriggerEnabled,
  isExperimentHighImpactTriggerEnabled,
  isExperimentMultiStepTriggerEnabled,
} from './ReflectionExperimentOverrides';

const HIGH_IMPACT_INTENTS = new Set([
  'PRICE_UPDATE',
  'COMPOUND_WORKFLOW',
  'APPROVE_CHANGES',
  'CREATE_PRODUCT',
  'SUPPLIER_CREATE',
  'LOW_MARGIN_REPORT',
]);

export function isExperienceReflectionEnabled(): boolean {
  if (process.env.PERSONAL_BRAIN_EXPERIENCE_REFLECTION_ENABLED === 'false') {
    return false;
  }
  return process.env.PERSONAL_BRAIN_MEMORY_REFLECTION_ENABLED !== 'false';
}

export function isFailureTriggerEnabled(): boolean {
  return isExperimentFailureTriggerEnabled();
}

export function isMultiStepTriggerEnabled(): boolean {
  return isExperimentMultiStepTriggerEnabled();
}

export function isHighImpactTriggerEnabled(): boolean {
  return isExperimentHighImpactTriggerEnabled();
}

export function getReflectionMinTools(): number {
  return getExperimentReflectionMinTools();
}

export function shouldReflect(context: ReflectionTriggerContext): boolean {
  return resolveTrigger(context) !== null;
}

export function resolveTrigger(context: ReflectionTriggerContext): ReflectionTrigger | null {
  if (!isExperienceReflectionEnabled()) return null;
  if (context.checkpoint) return null;

  const minTools = getReflectionMinTools();

  if (context.goalReached === false && isFailureTriggerEnabled()) {
    return 'failure';
  }

  if (isMultiStepTriggerEnabled() && context.usedAgentLoop && context.toolsUsed >= minTools) {
    return 'multi_step';
  }

  if (isHighImpactTriggerEnabled() && HIGH_IMPACT_INTENTS.has(context.intent)) {
    if (context.goalReached || context.toolsUsed > 0 || context.usedAgentLoop) {
      return 'high_impact';
    }
  }

  if (context.goalReached && context.toolsUsed >= minTools) {
    return 'multi_step';
  }

  return null;
}
