import { apiFetch, apiRoutes } from '@/lib/api';
import type { OverviewFeedParams, OverviewFeedResponse } from '../types/overviewFeed';

function overviewQuery(params: OverviewFeedParams): string {
  const q = new URLSearchParams();
  if (params.days != null) q.set('days', String(params.days));
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.cursor) q.set('cursor', params.cursor);
  if (params.agentKey) q.set('agentKey', params.agentKey);
  if (params.risk) q.set('risk', params.risk);
  if (params.module) q.set('module', params.module);
  if (params.executionMode) q.set('executionMode', params.executionMode);
  if (params.actionType) q.set('actionType', params.actionType);
  if (params.search) q.set('search', params.search);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export interface HandoffOverviewItem {
  id: string;
  at: string;
  fromAgentKey: string;
  toAgentKey: string;
  mode: 'sync' | 'async';
  status: 'completed' | 'failed' | 'running' | 'pending';
  intent?: string;
  summary?: string;
  correlationId?: string;
  explainSource?: { type: 'command' | 'proactive_suggestion'; id: string };
}

export const overviewApi = {
  fetchPage: (params?: OverviewFeedParams) =>
    apiFetch<OverviewFeedResponse>(`${apiRoutes.admin.overview}${overviewQuery(params ?? {})}`),
  fetchHandoffs: (days = 7, limit = 15) =>
    apiFetch<{ items: HandoffOverviewItem[] }>(
      `${apiRoutes.admin.overviewHandoffs}?days=${days}&limit=${limit}`,
    ),
};
