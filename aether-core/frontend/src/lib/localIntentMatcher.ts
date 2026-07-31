export type {
  DemoIntentId,
  LinkedInsightId,
  SuggestionCategory,
  DemoIntentMatch,
  DemoSuggestion,
  CompoundStepResult,
  DemoResponseVariant,
  DemoSecondaryMetric,
  DemoCommandResponse,
  DemoExplainStep,
} from './intents/types';
export type { SuggestionBuildInput } from './intents/suggestionRanking';

export { DEMO_SUGGESTIONS, IDLE_SUGGESTION_IDS } from './intents/demoSuggestions';
export { detectIntent, shouldShowIntentPill } from './intents/intentRules';
export {
  mergeAndRankSuggestions,
  filterSuggestions,
  getContextualSuggestionsForUnknown,
  getIdleSuggestions,
  groupSuggestionsByCategory,
} from './intents/suggestionRanking';
export {
  getLoadingPhases,
  getCompoundStepLoadingPhases,
  buildCompoundDemoResponse,
  getExplainTimeline,
  buildDemoResponse,
  intentLabel,
  intentToLinkedInsight,
} from './intents/demoResponses';
