import type { ReflectionVariantConfig } from './experiments/types';

let activeOverride: ReflectionVariantConfig | null = null;

export function setReflectionExperimentOverride(config: ReflectionVariantConfig | null): void {
  activeOverride = config;
}

export function getReflectionExperimentOverride(): ReflectionVariantConfig | null {
  return activeOverride;
}

export function isExperimentFailureTriggerEnabled(): boolean {
  const o = activeOverride;
  if (o && o.failureTrigger === false) return false;
  return process.env.PERSONAL_BRAIN_REFLECTION_TRIGGER_FAILURE !== 'false';
}

export function isExperimentMultiStepTriggerEnabled(): boolean {
  const o = activeOverride;
  if (o && o.multiStepTrigger === false) return false;
  return process.env.PERSONAL_BRAIN_REFLECTION_TRIGGER_MULTI_STEP !== 'false';
}

export function isExperimentHighImpactTriggerEnabled(): boolean {
  const o = activeOverride;
  if (o && o.highImpactTrigger === false) return false;
  return process.env.PERSONAL_BRAIN_REFLECTION_TRIGGER_HIGH_IMPACT !== 'false';
}

export function getExperimentReflectionMinTools(): number {
  const o = activeOverride;
  if (o?.minTools != null && o.minTools > 0) return o.minTools;
  const raw = process.env.PERSONAL_BRAIN_REFLECTION_MIN_TOOLS;
  const parsed = raw ? parseInt(raw, 10) : 2;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
}

export function isExperimentAdaptiveHintsEnabled(): boolean {
  const o = activeOverride;
  if (o && o.adaptiveHints === false) return false;
  return process.env.PERSONAL_BRAIN_REFLECTION_ADAPTIVE_ENABLED !== 'false';
}

export function isExperimentDistillationEnabled(): boolean {
  const o = activeOverride;
  if (o && o.distillationEnabled === false) return false;
  return process.env.PERSONAL_BRAIN_REFLECTION_DISTILLATION_ENABLED !== 'false';
}
