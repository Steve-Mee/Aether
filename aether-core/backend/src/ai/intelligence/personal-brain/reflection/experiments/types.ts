export interface ReflectionVariantConfig {
  adaptiveHints?: boolean;
  failureTrigger?: boolean;
  highImpactTrigger?: boolean;
  multiStepTrigger?: boolean;
  distillationEnabled?: boolean;
  minTools?: number;
}

export interface ResolvedReflectionExperiment {
  experimentId: string | null;
  variantArm: 'control' | 'treatment';
  config: ReflectionVariantConfig;
}

export const DEFAULT_REFLECTION_VARIANT: ReflectionVariantConfig = {
  adaptiveHints: true,
  failureTrigger: true,
  highImpactTrigger: true,
  multiStepTrigger: true,
  distillationEnabled: true,
};
