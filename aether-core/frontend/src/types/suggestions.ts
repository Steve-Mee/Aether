import type { DemoSuggestion } from '@/lib/localIntentMatcher';

export interface ApiSuggestionsResponse {
  nowRelevant: DemoSuggestion[];
  groups: Array<{ category: string; label: string; items: DemoSuggestion[] }>;
  suggestions: DemoSuggestion[];
  proactive?: DemoSuggestion[];
}

export interface ApiProactiveSuggestion {
  id: string;
  label: string;
  command: string;
  intentId: string;
  category: string;
  hint?: string;
  executionMode?: 'autonomous' | 'approval_required' | 'inform_only';
  badge?: string;
  source: string;
  priority: number;
  triggerId?: string;
  agentKey?: string;
  riskLevel?: string;
  hasExplainability?: boolean;
}

export interface ApiProactiveSuggestionsResponse {
  suggestions: ApiProactiveSuggestion[];
}
