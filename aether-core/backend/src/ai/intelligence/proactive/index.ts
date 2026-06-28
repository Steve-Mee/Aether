export { isProactiveBrainEnabled, resolveProactiveBrainIntervalMs } from './proactiveConfig';
export type {
  ProactiveFinding,
  ProactiveTriggerDefinition,
  ProactiveEvalContext,
} from './ProactiveTriggerDefinition';
export { ProactiveTriggerRegistry, defaultProactiveTriggerRegistry } from './ProactiveTriggerRegistry';
export { ProactiveEvaluator } from './ProactiveEvaluator';
export { ProactiveSuggestionRepository } from './ProactiveSuggestionRepository';
export {
  ProactiveSuggestionService,
  type ProactiveSuggestionDto,
} from './ProactiveSuggestionService';
export {
  filterProactiveByPrefs,
  isProactiveCategoryEnabled,
  proactivePrefsAllowsIngest,
} from './proactivePrefsFilter';
