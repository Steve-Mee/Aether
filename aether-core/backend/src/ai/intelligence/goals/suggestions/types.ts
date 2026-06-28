import type { GoalMetricType } from '../types';

export interface GoalSuggestionRecord {
  id: string;
  tenantId: string;
  dedupeKey: string;
  title: string;
  metricType: GoalMetricType;
  metricScope: Record<string, unknown>;
  suggestedTarget: number;
  suggestedBaseline: number;
  suggestedDeadline: Date;
  confidence: number;
  rationale: string;
  evidence: Record<string, unknown>;
  status: 'pending' | 'accepted' | 'dismissed';
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalSuggestionInput {
  dedupeKey: string;
  title: string;
  metricType: GoalMetricType;
  metricScope?: Record<string, unknown>;
  suggestedTarget: number;
  suggestedBaseline: number;
  suggestedDeadline: Date;
  confidence: number;
  rationale: string;
  evidence: Record<string, unknown>;
}
