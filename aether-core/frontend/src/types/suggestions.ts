import type { DemoSuggestion } from '@/lib/localIntentMatcher';

export interface ApiSuggestionsResponse {
  nowRelevant: DemoSuggestion[];
  groups: Array<{ category: string; label: string; items: DemoSuggestion[] }>;
  suggestions: DemoSuggestion[];
}
