import type {
  ExperienceReflection,
  ExperienceReflectionResult,
  ReflectionInput,
  ReflectionTriggerContext,
} from './types';

export interface ExperienceReflectionPort {
  shouldReflect(context: ReflectionTriggerContext): boolean;
  resolveTrigger(context: ReflectionTriggerContext): import('./types').ReflectionTrigger | null;
  reflect(input: ReflectionInput): Promise<ExperienceReflection | null>;
  reflectAndStore(input: ReflectionInput): Promise<ExperienceReflectionResult | null>;
}
